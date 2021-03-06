import React from 'react';
import { connect } from 'react-redux';
import { generateAccessibleKeyUpClickHandler } from '../util/events';
import { Redirect } from 'react-router-dom';
import Select from 'react-select';
import 'react-select/dist/react-select.css';
import * as moment from 'moment';
import { Button } from '../shared';
import {
	getSupportedVideoFormats,
	getAnalysisMethods,
	getAnalysisMethodsById,
	getAnalysisMethodsError,
} from '../module';
import FileSelectButton from './FileSelectButton';
import {
	request,
	setFiles,
	setDescription,
	reset,
	addAlgorithmInstance,
	deleteAlgorithmInstance,
	enableAlgorithmInstance,
	enableCustomAlgorithmInstanceParameters,
	setCustomAlgorithmInstanceParameters,
	dismissError,
	getFiles,
	getDescription,
	getAlgorithmInstances,
	getRequest,
	getResult,
	getError,
} from './module';
import './Uploader.scss';

export class Uploader extends React.PureComponent {
	state = {
		redirect: false,
	};

	onUpload = event => {
		this.setState({ redirect: true });
		this.props.upload(event);
	};

	handleEnableAlgorithm = algorithm => () =>
		this.props.enableAlgorithmInstance(algorithm, algorithm.disabled);
	handleEnableParameters = algorithm => () =>
		this.props.enableCustomAlgorithmInstanceParameters(
			algorithm,
			!algorithm.allowParameters
		);
	setInstanceParameters = (algorithm, instance) => {
		var parameters = {};
		Array.from(
			document.getElementById(instance).querySelectorAll('input')
		).forEach(input => {
			parameters[input.name] = input.value;
		});
		this.props.setCustomAlgorithmInstanceParameters(
			algorithm,
			parameters,
			true
		);
	};
	revertInstanceParameters = algorithm => () =>
		this.props.setCustomAlgorithmInstanceParameters(
			algorithm,
			this.props.methods.ids[algorithm.mid].parameters
		);
	formatDescription(method) {
		var description = method.description;
		if (method.creationDate) {
			description += ' (';
			description += moment(method.creationDate * 1000).format(
				'YYYY-MM-DD HH:mm:ss'
			);
			description += ')';
		}
		return description;
	}
	componentDidUpdate() {
		if (this.props.result && !this.props.result.progress) {
			this.props.reset();
			this.setState({ redirect: false });
		}
	}
	render() {
		var popup, error;
		if (this.props.files) {
			if (this.props.error) {
				error = (
					<div className="popup-overlay">
						<div className="popup error">
							<h3>
								{this.props.error.message.error || "We've encountered an error"}
							</h3>
							<p>The server had this to say:</p>
							<p className="details">
								{this.props.error.message.details ||
									this.props.error.message.error}
							</p>
							<div className="buttons">
								<Button className="ok" onClick={this.props.dismissError}>
									OK
								</Button>
							</div>
						</div>
					</div>
				);
			}
			popup = (
				<div className="popup-overlay">
					<div
						className={
							'popup' +
							(this.props.request &&
							(!this.props.result ||
								this.props.result.progress === 'indefinite')
								? ' busy'
								: '')
						}
					>
						<h3>Select one or more algorithms for automation</h3>
						<Select
							onBlurResetsInput={false}
							onSelectResetsInput={false}
							placeholder={'Select an algorithm to add\u2026'}
							options={this.props.methods.list
								.filter(method => method.automated)
								.map(method => ({
									value: method.mid,
									label: this.formatDescription(method),
								}))}
							simpleValue
							value=""
							onChange={value =>
								this.props.addAlgorithmInstance(this.props.methods.ids[value])
							}
							searchable={false}
						/>
						<ul>
							{this.props.algorithms &&
								this.props.algorithms.map(algorithm => (
									<li key={algorithm.id}>
										<span
											className="box"
											style={{ color: algorithm.color }}
											role="checkbox"
											aria-checked={!algorithm.disabled}
											tabIndex="0"
											onKeyUp={generateAccessibleKeyUpClickHandler(
												this.handleEnableAlgorithm(algorithm)
											)}
											onClick={this.handleEnableAlgorithm(algorithm)}
										/>
										<span
											className="toggle"
											role="button"
											aria-controls={'a' + algorithm.id}
											aria-expanded={!!algorithm.allowParameters}
											tabIndex="0"
											onKeyUp={generateAccessibleKeyUpClickHandler(
												this.handleEnableParameters(algorithm)
											)}
											onClick={this.handleEnableParameters(algorithm)}
										>
											<i
												className={
													'icon fa fa-fw fa-chevron-' +
													(algorithm.allowParameters ? 'down' : 'right')
												}
											/>
											<span className="icon-label">
												{algorithm.allowParameters
													? 'Close parameters'
													: 'Open parameters'}
											</span>
										</span>
										<h4>{this.formatDescription(algorithm)}</h4>
										<span
											className="delete"
											roll="button"
											title="Delete algorithm instance"
											tabIndex="0"
											onKeyUp={generateAccessibleKeyUpClickHandler(() =>
												this.props.deleteAlgorithmInstance(algorithm)
											)}
											onClick={() =>
												this.props.deleteAlgorithmInstance(algorithm)
											}
										>
											<i className="fa fa-times" />
											<span className="icon-label">
												delete algorithm instance
											</span>
										</span>
										{Object.keys(algorithm.parameters).length ? (
											<table id={'a' + algorithm.id} className="parameters">
												<thead>
													<tr>
														<th>Parameter</th>
														<th>
															Value
															{algorithm.dirty && (
																<Button
																	className="revert"
																	onClick={this.revertInstanceParameters(
																		algorithm
																	)}
																	title="Revert to original parameters"
																	iconOnly
																>
																	Revert to original paramters
																</Button>
															)}
														</th>
													</tr>
												</thead>
												<tbody>
													{Object.keys(algorithm.parameters).map(parameter => (
														<tr key={algorithm.id + '-' + parameter}>
															<td>{algorithm.metadata[parameter].argname}</td>
															<td className="value">
																<input
																	name={parameter}
																	onChange={() =>
																		this.setInstanceParameters(
																			algorithm,
																			'a' + algorithm.id
																		)
																	}
																	value={algorithm.parameters[parameter]}
																/>
															</td>
															<td style={{ background: 'inherit' }}>
																{algorithm.metadata[parameter].help}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										) : (
											<p className="parameters">
												This algorithm is not configurable.
											</p>
										)}
									</li>
								))}
						</ul>
						<h4 className="description-label">Video Name</h4>
						<input
							type="text"
							onChange={event => this.props.setDescription(event.target.value)}
							value={this.props.description}
						/>
						<div className="buttons">
							<Button
								className="save"
								onClick={this.onUpload}
								disabled={
									!this.props.algorithms.length ||
									!this.props.description ||
									this.props.request
								}
							>
								Save
							</Button>
							<Button
								className="cancel"
								onClick={() => this.props.setFiles(null)}
								disabled={this.props.request}
							>
								Cancel
							</Button>
						</div>
						{this.props.result && this.props.result.progress !== 'indefinite' && (
							<svg width="100%" height="100%">
								<circle className="background" cx="0" cy="0" r="15.9155" />
								<circle
									className="foreground"
									cx="0"
									cy="0"
									r="15.9155"
									style={{
										strokeDasharray: this.props.result.progress * 100 + ' 100',
									}}
								/>
							</svg>
						)}
					</div>
					{error}
				</div>
			);
		}
		const isRoot = window.location.href.endsWith('/#/');
		if (
			(!isRoot && this.state.redirect) ||
			(this.props.result && !this.props.result.progress && !this.props.error)
		) {
			popup = <Redirect to="/" />;
		}
		return (
			<div className="uploader">
				<FileSelectButton className="add" wide>
					Add Video(s)
				</FileSelectButton>
				{popup}
			</div>
		);
	}
}
const mapStateToProps = state => ({
	supportedVideoFormats: getSupportedVideoFormats(state),
	files: getFiles(state),
	description: getDescription(state),
	algorithms: getAlgorithmInstances(state),
	request: getRequest(state),
	result: getResult(state),
	methods: {
		list: getAnalysisMethods(state),
		ids: getAnalysisMethodsById(state),
	},
	analysisMethodsError: getAnalysisMethodsError(state),
	error: getError(state),
});

export default connect(
	mapStateToProps,
	{
		upload: request,
		setFiles,
		setDescription,
		reset,
		addAlgorithmInstance,
		deleteAlgorithmInstance,
		enableAlgorithmInstance,
		enableCustomAlgorithmInstanceParameters,
		setCustomAlgorithmInstanceParameters,
		dismissError,
	}
)(Uploader);
