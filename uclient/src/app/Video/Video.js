import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import _ from 'lodash';
import { formatDuration } from '../util/videos';
import Button from '../util/Button';
import Busy from '../Busy';
import OccurrencesBar from './OccurrencesBar';
import {
	getServicePath,
	getAnalysisMethods,
	getAnalysisMethodsById,
	getAnalysisMethodsError,
} from '../module';
import { request, getVideo, getVideoError } from './module';
import './Video.scss';

export class Video extends React.Component {
	constructor() {
		super();
		this.state = {
			paused: true,
			detections: [],
		};
		this.updateLayout = _.debounce(this.updateLayout, 200);
	}
	// If we don't capature the mouse, then if the take the mouse out of the
	// element and release it, we won't get notified and they'll be stuck
	captureMouse(event) {
		// IE10; Do we care?
		if (event.target.msSetPointerCapture) {
			event.target.msSetPointerCapture(event.pointerId);
		} else if (event.target.setPointerCapture) {
			event.target.setPointerCapture(event.pointerId);
		}
	}
	releaseMouse(event) {
		if (event.target.msReleasePointerCapture) {
			event.target.msReleasePointerCapture(event.pointerId);
		} else if (event.target.releasePointerCapture) {
			event.target.releasePointerCapture(event.pointerId);
		}
	}
	rewindFrame = timestamp => {
		let progress = timestamp - this.timestamp;
		// Unfortunately Firefox shows a loading overlay if we do this too many
		// times in a row and it doesn't go away until we stop.
		this.player.currentTime -=
			((this.player.defaultPlaybackRate * 4) / 1000) * progress;
		this.timestamp = timestamp;
		if (!this.stopRewinding) {
			requestAnimationFrame(this.rewindFrame);
		}
	};
	rewind(event, start) {
		if (start) {
			this.captureMouse(event);
			// Firefox throws an error when we do this, so we can't do the same
			// simple thing we do with fast forward. Bummer. :(
			//this.player.playbackRate = -4;
			this.player.pause();
			this.timestamp = performance.now();
			delete this.stopRewinding;
			this.rewindFrame(this.timestamp);
		} else {
			this.stopRewinding = true;
			this.releaseMouse(event);
			this.player.playbackRate = this.player.defaultPlaybackRate;
		}
	}
	fastForward(event, start) {
		if (start) {
			this.continuePlayback = !this.player.paused;
			this.captureMouse(event);
			this.player.playbackRate = this.player.defaultPlaybackRate * 4;
			this.player.play();
		} else {
			this.releaseMouse(event);
			this.player.playbackRate = this.player.defaultPlaybackRate;
			if (!this.continuePlayback) {
				this.player.pause();
			}
		}
	}
	timeUpdate = () => {
		var detections = [],
			frame = Math.floor(this.player.currentTime * this.props.video.fps);

		if (this.props.video.analyses) {
			this.props.video.analyses.forEach(analysis => {
				if (analysis.status === 'FINISHED') {
					detections.push({
						id: analysis.id,
						name: this.props.methods.ids[analysis.method].description,
						color: this.props.methods.ids[analysis.method].color,
						results: analysis.results[frame] || {
							detections: [],
						},
					});
				}
			});

			this.setState({
				detections,
			});
		}
	};
	computeFrame = (time, single) => {
		var canvasCtx = this.canvas.getContext('2d');
		var frame = Math.floor(this.player.currentTime * this.props.video.fps);

		if (!single) {
			requestAnimationFrame(this.computeFrame);
		}
		canvasCtx.drawImage(
			this.player,
			0,
			0,
			this.canvas.width,
			this.canvas.height
		);
		if (this.props.video.analyses) {
			this.props.video.analyses.forEach(analysis => {
				if (analysis.status === 'FINISHED') {
					analysis.results[frame].detections.map(item => {
						canvasCtx.beginPath();
						canvasCtx.lineWidth = '6';
						canvasCtx.strokeStyle = this.props.methods.ids[
							analysis.method
						].color;
						canvasCtx.rect(
							item.x1 <= item.x2 ? item.x1 : item.x2,
							item.y1 <= item.y2 ? item.y1 : item.y2,
							Math.abs(item.x1 - item.x2),
							Math.abs(item.y1 - item.y2)
						);
						canvasCtx.stroke();
					});
				}
			});
		}
	};
	updateLayout = () => {
		this.canvas.width = this.player.videoWidth;
		this.canvas.height = this.player.videoHeight;
		this.computeFrame(-1, true);
	};
	componentDidMount() {
		this.props.requestVideo(this.props.match.params.id);
		window.addEventListener('resize', this.updateLayout);
	}
	componentWillUnmount() {
		window.removeEventListener('resize', this.updateLayout);
	}
	render() {
		var video = <Busy error={this.props.error} />,
			analyses,
			processing = 0;

		if (this.props.video && !this.props.error) {
			analyses = [];

			this.props.video.analyses.forEach(analysis => {
				if (analysis.status === 'FINISHED') {
					analyses.push(
						<OccurrencesBar
							key={analysis.id}
							analysis={analysis}
							color={this.props.methods.ids[analysis.method].color}
						/>
					);
				} else {
					processing++;
				}
			});

			if (processing) {
				processing = (
					<div className="occurrences-bar">
						{processing} analys{processing === 1 ? 'i' : 'e'}s processing
					</div>
				);
			} else {
				processing = undefined;
			}

			video = (
				<section>
					<header>
						<h2>{this.props.video.filename}</h2>
						<div className="info">
							<span className="icon-label">Info</span>
							<i className="icon info" />
							<div className="popup">
								<div>
									<strong>Name:</strong> {this.props.video.filename}
								</div>
								<div>
									<strong>Description:</strong> {this.props.video.description}
								</div>
								<div>
									<strong>FPS:</strong> {this.props.video.fps}
								</div>
								<div>
									<strong>Duration:</strong> {formatDuration(this.props.video)}
								</div>
							</div>
						</div>
					</header>
					<div className="viewer">
						<video
							ref={player => (this.player = player)}
							src={
								this.props.servicePath +
								'video/' +
								this.props.video.id +
								'/file'
							}
							onPlay={() => this.setState({ paused: false })}
							onPause={() => this.setState({ paused: true })}
							onTimeUpdate={this.timeUpdate}
							onLoadedData={() => {
								if (this.player.readyState >= 2) {
									this.updateLayout();
								}
							}}
							onPlaying={this.computeFrame}
							crossOrigin="anonymous"
							playsInline
						>
							Sorry, this browser does not support video playback.
						</video>
						<canvas ref={canvas => (this.canvas = canvas)} />
						<div className="analyses">
							{analyses}
							{processing}
							<div className="scrubber">
								<i className="fa fa-triangle-down" />
							</div>
						</div>
					</div>
					<div className="annotations">
						<h3>Detections and Annotations</h3>
						<ul>
							{this.state.detections.map(method => (
								<li key={method.id} className="method">
									<span className="box" style={{ background: method.color }} />
									<h4>{method.name}</h4>
									<ul>
										{(method.name === 'manual' &&
											method.results.detections.map((detection, index) => (
												<li key={method.id + '-' + index}>Fish {index + 1}</li>
											))) ||
											(method.results.detections.length && (
												<li key={method.id + '-count'}>
													Fish {method.results.detections.length}
												</li>
											)) ||
											''}
									</ul>
								</li>
							))}
						</ul>
					</div>
					<div className="controls">
						<Button
							className="rewind"
							onMouseDown={event => this.rewind(event, true)}
							onMouseUp={event => this.rewind(event, false)}
							iconOnly
						>
							Rewind
						</Button>
						<Button className="previous-frame" iconOnly>
							Previous Frame
						</Button>
						{this.state.paused ? (
							<Button
								className="play"
								onClick={() => this.player.play()}
								iconOnly
							>
								Play
							</Button>
						) : (
							<Button
								className="pause"
								onClick={() => this.player.pause()}
								iconOnly
							>
								Pause
							</Button>
						)}
						<Button className="next-frame" iconOnly>
							Next Frame
						</Button>
						<Button
							className="fast-forward"
							onMouseDown={event => this.fastForward(event, true)}
							onMouseUp={event => this.fastForward(event, false)}
							iconOnly
						>
							Fast Forward
						</Button>
					</div>
					<div className="options">
						<Button className="annotate">Annotation</Button>
						<Button className="download" disabled>
							Download
						</Button>
					</div>
				</section>
			);
		}
		return (
			<div className="video-detail">
				<Link to="/">
					<i className="icon fa fa-chevron-left" />
					Thumbnail View
				</Link>
				{video}
			</div>
		);
	}
}
const mapStateToProps = state => ({
	servicePath: getServicePath(state),
	video: getVideo(state),
	methods: {
		list: getAnalysisMethods(state),
		ids: getAnalysisMethodsById(state),
	},
	error: getVideoError(state) || getAnalysisMethodsError(state),
});

export default connect(
	mapStateToProps,
	{
		requestVideo: request,
	}
)(Video);
