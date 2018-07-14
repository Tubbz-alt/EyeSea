import React from 'react';
import {
	generateAccessibleKeyUpClickHandler,
	generateAccessibleKeyDownClickHandler,
} from '../events';
import './Button.scss';

export default class Button extends React.PureComponent {
	render() {
		var className =
			'btn ' +
			(this.props.wide ? ' wide ' : '') +
			(this.props.disabled ? ' disabled ' : '') +
			(this.props.className || '');

		var content = this.props.iconOnly ? (
			<span className="icon-label">{this.props.children}</span>
		) : (
			this.props.children
		);

		var onKeyDown = generateAccessibleKeyDownClickHandler(
			this.props.onMouseDown
				? event => {
						this.props.onMouseDown(event);
						this.props.onClick && this.props.onClick(event);
				  }
				: this.props.onClick
		);

		var onKeyUp = generateAccessibleKeyUpClickHandler(
			this.props.onMouseUp
				? event => {
						this.props.onMouseUp(event);
						this.props.onClick && this.props.onClick(event);
				  }
				: this.props.onClick
		);

		if (this.props.file) {
			return (
				<label
					className={className + ' file'}
					role="button"
					tabIndex="0"
					onDragOver={event => e.preventDefault()}
					onDrop={event => {
						event.preventDefault();
						if (this.props.onSelect) {
							this.props.onSelect(event.dataTransfer.files);
						}
					}}
					onKeyDown={onKeyDown}
					onKeyUp={onKeyUp}
					onMouseDown={event => {
						event.preventDefault();
						this.fileInput.value = '';
						this.props.onMouseDown && this.props.onMouseDown(event);
					}}
					onMouseUp={this.props.onMouseUp}
					onClick={this.props.onClick}
				>
					<input
						ref={input => (this.fileInput = input)}
						type="file"
						accept={this.props.accept || ''}
						onChange={event => {
							if (this.props.onSelect) {
								this.props.onSelect(this.fileInput.files);
							}
						}}
					/>
					{content}
				</label>
			);
		} else {
			return (
				<span
					className={className}
					role="button"
					tabIndex="0"
					onKeyDown={onKeyDown}
					onKeyUp={onKeyUp}
					onMouseDown={event => {
						event.preventDefault();
						this.props.onMouseDown && this.props.onMouseDown(event);
					}}
					onMouseUp={this.props.onMouseUp}
					onClick={this.props.onClick}
				>
					{content}
				</span>
			);
		}
	}
}
