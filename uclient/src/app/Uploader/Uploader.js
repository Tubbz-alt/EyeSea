import React from 'react';
import { connect } from 'react-redux';
import {
	generateAccessibleKeyUpClickHandler,
	generateAccessibleKeyDownClickHandler,
} from '../util/events';
import Select from 'react-select';
import 'react-select/dist/react-select.css';
import Button from '../util/Button';
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
	addAlgorithmInstance,
	deleteAlgorithmInstance,
	enableAlgorithmInstance,
	enableCustomAlgorithmInstanceParameters,
	setCustomAlgorithmInstanceParameters,
	getFiles,
	getAlgorithmInstances,
	getResult,
	getError,
} from './module';
import './Uploader.scss';

export class Uploader extends React.Component {
	handleEnableAlgorithm = algorithm => event =>
		this.props.enableAlgorithmInstance(algorithm, algorithm.disabled);
	handleEnableParameters = algorithm => event =>
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
		this.props.setCustomAlgorithmInstanceParameters(algorithm, parameters);
	};
	revertInstanceParameters = algorithm => event =>
		this.props.setCustomAlgorithmInstanceParameters(
			algorithm,
			this.props.methods.ids[algorithm.mid].parameters
		);
	render() {
		var popup;
		if (this.props.files) {
			popup = (
				<div className="popup-overlay">
					<div className="popup">
						<h3>Select one or more algorithms for automation</h3>
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
										<h4>{algorithm.description}</h4>
										<table id={'a' + algorithm.id} className="parameters">
											<thead>
												<tr>
													<th>Parameter</th>
													<th>Value</th>
												</tr>
											</thead>
											<tbody>
												{Object.keys(algorithm.parameters).map(
													(parameter, index) => (
														<tr key={algorithm.id + '-' + parameter}>
															<td>{parameter}</td>
															<td className="value">
																<input
																	name={parameter}
																	onChange={event =>
																		this.setInstanceParameters(
																			algorithm,
																			'a' + algorithm.id
																		)
																	}
																	value={algorithm.parameters[parameter]}
																/>
															</td>
															<td className="revert">
																{index === 0 ? (
																	<span
																		role="button"
																		tabIndex="0"
																		onKeyUp={generateAccessibleKeyUpClickHandler(
																			this.revertInstanceParameters(algorithm)
																		)}
																		onClick={this.revertInstanceParameters(
																			algorithm
																		)}
																	>
																		<i
																			className="icon fa fa-undo"
																			title="Revert to original parameters"
																		/>
																		<span className="icon-label">
																			Revert to original paramters
																		</span>
																	</span>
																) : null}
															</td>
														</tr>
													)
												)}
											</tbody>
										</table>
									</li>
								))}
							<li>
								<Select
									onBlurResetsInput={false}
									onSelectResetsInput={false}
									placeholder={'Select an algorithm to add\u2026'}
									options={this.props.methods.list
										.filter(method => method.automated)
										.map(method => ({
											value: method.mid,
											label: method.description,
										}))}
									simpleValue
									value=""
									onChange={value =>
										this.props.addAlgorithmInstance(
											this.props.methods.ids[value]
										)
									}
									searchable={false}
								/>
							</li>
						</ul>
						<div className="buttons">
							<Button className="save">Select</Button>
							<Button
								className="cancel"
								onClick={event => this.props.setFiles(null)}
							>
								Cancel
							</Button>
						</div>
					</div>
				</div>
			);
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
	algorithms: getAlgorithmInstances(state),
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
		addAlgorithmInstance,
		deleteAlgorithmInstance,
		enableAlgorithmInstance,
		enableCustomAlgorithmInstanceParameters,
		setCustomAlgorithmInstanceParameters,
	}
)(Uploader);
