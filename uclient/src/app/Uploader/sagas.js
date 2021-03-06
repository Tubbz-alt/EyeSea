import { eventChannel } from 'redux-saga';
import { put, take, takeLatest, select } from 'redux-saga/effects';

import {
	REQUEST,
	SUCCESS,
	ERROR,
	FINISHED,
	getFiles,
	getDescription,
	getAlgorithmInstances,
} from './module';

export function* uploadVideos(action) {
	try {
		let files = yield select(getFiles);
		let description = yield select(getDescription);
		let algorithms = yield select(getAlgorithmInstances);

		let form = new FormData();
		form.append('upload', files[0]);
		form.append('description', description);
		form.append(
			'analyses',
			JSON.stringify(
				algorithms.filter(algorithm => !algorithm.disabled).map(algorithm => ({
					mid: algorithm.mid,
					parameters: algorithm.parameters,
				}))
			)
		);

		var request = eventChannel(function(emit) {
			var request = new XMLHttpRequest();
			request.onreadystatechange = function() {
				if (request.readyState === 4) {
					try {
						if (request.status === 200) {
							emit({ result: JSON.parse(request.responseText) });
							emit('DONE');
						} else {
							emit({ error: JSON.parse(request.responseText) });
							emit('DONE');
						}
					} catch (error) {
						// It's not JSON or invalid JSON, but probably safe to assume it's
						// a generic error from the server such as in the case of a 500 code.
						emit({ error: request.responseText });
						emit('DONE');
					}
				}
			};
			request.upload.addEventListener('progress', function(event) {
				emit({
					progress: event.lengthComputable
						? event.loaded / event.total
						: 'indeterminate',
				});
			});
			request.open('POST', action.servicePath + 'video');
			request.send(form);

			return function() {
				request.abort();
			};
		});

		let event = yield take(request);
		let error = false;
		while (event !== 'DONE') {
			if (event.error || (event.result && event.result.error)) {
				yield put({
					type: ERROR,
					payload: event.error || event.result.error,
				});
				error = true;
			} else {
				yield put({
					type: SUCCESS,
					payload: event.result || event,
				});
			}
			event = yield take(request);
		}

		if (!error) {
			yield put({
				type: FINISHED,
				servicePath: true,
			});
		}
	} catch (error) {
		console.log('uploadVideos', error);
		yield put({
			type: ERROR,
			payload: error,
		});
	}
}

export default function*() {
	yield [takeLatest(REQUEST, uploadVideos)];
}
