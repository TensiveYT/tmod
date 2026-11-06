import { Knob } from '../util/util';
import { Notification } from '../libs/Notification';
import { state, getClient, getPiano } from '../util/state';
import { settings } from '../modules/settings/settings';
import {
	press,
	release,
	pressSustain,
	releaseSustain,
	getAutoSustain,
} from '../util/actions';
import { 
	MIDI_KEY_NAMES, 
	MIDI_NOTE_NUMBERS, 
	MIDI_TRANSPOSE 
} from '../util/constants';
import { MidiInputInfo } from '../types';

/* import: settings */
import { DISABLE_MIDI_OUTPUT } from '../modules/settings/tmod/tmod-optimization'
import { USE_128_KEYS } from '../modules/settings/tmod/tmod-piano'

export function initMidi(): void {
	const gClient = getClient();
	const gPiano = getPiano();

	let devices_json = '[]';
	function sendDevices() {
		gClient.sendArray([{ m: 'devices', list: JSON.parse(devices_json) }]);
	}
	gClient.on('connect', sendDevices);

	const pitchBends: Record<number, number> = {};
	for (let i = 0; i < 16; i++) pitchBends[i] = 0;

	if (navigator.requestMIDIAccess) {
		navigator.requestMIDIAccess().then(
			midi => {
				let ins : { enabled: boolean, volume: number, port: MIDIInput  }[] = []
				let outs: { enabled: boolean, volume: number, port: MIDIOutput }[] = []
				function midimessagehandler(
					evt: MIDIMessageEvent & {
						target: { enabled: boolean; volume: number };
					},
				) {
					if (!evt.target!.enabled) return;
					if (!evt.data) return;

					const channel = evt.data[0] & 0xf;
					const cmd = evt.data[0] >> 4;
					const note_number = evt.data[1];
					let vel = evt.data[2];
					if (settings.disableMIDIDrumChannel && channel === 9) return;

					const { getTranspose } = require('../modules/keyboard');
					const transpose = getTranspose();

					if (cmd === 8 || (cmd === 9 && vel === 0)) {
						release(
							MIDI_KEY_NAMES[
								note_number -
									9 +
									MIDI_TRANSPOSE +
									transpose +
									pitchBends[channel]
							],
						);
					} else if (cmd === 9) {
						if (evt.target.volume !== undefined) vel *= evt.target.volume;
						press(
							MIDI_KEY_NAMES[
								note_number -
									9 +
									MIDI_TRANSPOSE +
									transpose +
									pitchBends[channel]
							],
							vel / 127,
						);
					} else if (cmd === 11) {
						if (!getAutoSustain()) {
							if (note_number === 64) {
								if (vel > 20) pressSustain();
								else releaseSustain();
							}
						}
					} else if (cmd === 14) {
						let pitchMod = evt.data[1] + (evt.data[2] << 7) - 0x2000;
						pitchMod = Math.round(pitchMod / 1000);
						pitchBends[channel] = pitchMod;
					}
				}
				function deviceInfo(dev: MidiInputInfo) {
					return {
						type: dev.type,
						manufacturer: dev.manufacturer,
						name: dev.name,
						version: dev.version,
						enabled: dev.enabled,
						volume: dev.volume,
					};
				}

				function updateDevices() {
					const list: Array<MidiInputInfo> = [];
					if (midi.inputs.size > 0) {
						for (let i = 0; i < ins.length; i++) {
							let { port } = ins[i]
							list.push(deviceInfo(port))
						}
					}
					if (midi.outputs.size > 0) {
						for (let i = 0; i < outs.length; i++) {
							let { port } = outs[i]
							list.push(deviceInfo(port))
						}
					}
					const new_json = JSON.stringify(list)
					if (new_json !== devices_json) {
						devices_json = new_json
						sendDevices()
					}
				}

				function plug() {
					ins  = Array.from(midi.inputs .values()).map((port, i) => ({ enabled: ins [i]?.enabled ?? false, volume: 1.0, port }))
					outs = Array.from(midi.outputs.values()).map((port, i) => ({ enabled: outs[i]?.enabled ?? false, volume: 1.0, port }))
					if (midi.inputs.size > 0) {
						for (let i = 0; i < ins.length; i++) {
							let input = ins[i];
							input.port.onmidimessage = midimessagehandler as (
								this: MIDIInput,
								ev: MIDIMessageEvent,
							) => any
							if (input.enabled !== false) input.enabled = true
							if (typeof input.volume === 'undefined') input.volume = 1.0
						}
					}
					if (midi.outputs.size > 0) {
						state.midiOutTest = (note_name, vel, delay_ms, participantId) => {
							if (
								!settings.outputOwnNotes &&
								participantId === gClient.participantId
							)
								return
							
							if (DISABLE_MIDI_OUTPUT)
								return

							let timestamp = performance.now() + delay_ms
							
							let note_number = MIDI_NOTE_NUMBERS.get(note_name)
							if (note_number === undefined) 
								return

							let nn = USE_128_KEYS ? note_number : (note_number + 9 - MIDI_TRANSPOSE)

							for (let i = 0; i < outs.length; i++) {
								let output = outs[i]
								if (!output.enabled)
									continue
								output.port.send(
									[0x90, nn, vel * output.volume],
									timestamp,
								)
							}
						}
					}
					showConnections(false);
					updateDevices();
				}

				midi.addEventListener('statechange', () => {
					plug();
				});

				let connectionsNotification: { close: () => void } | null = null;
				function showConnections(sticky: boolean) {
					const inputs_ul = document.createElement('ul');
					if (midi.inputs.size > 0) {
						for (let i = 0; i < ins.length; i++) {
							let input = ins[i]
							const li = document.createElement('li') as HTMLLIElement & {
								connectionId: string;
							};
							li.connectionId = input.port.id;
							li.classList.add('connection');
							if (input.enabled) li.classList.add('enabled');
							li.textContent = input.port.name;
							li.addEventListener('click', (evt: Event) => {
								for (let i = 0; i < ins.length; i++) {
									let input = ins[i]
									if (
										input.port.id ===
										(evt.target as HTMLElement & { connectionId: string })
											.connectionId
									) {
										input.enabled = !input.enabled;
										(evt.target as HTMLElement).classList.toggle('enabled');
										updateDevices();
										return;
									}
								}
							});
							if (settings.midiVolumeTest) {
								let knobCanvas = document.createElement('canvas');
								Object.assign(knobCanvas, {
									width: 16 * window.devicePixelRatio,
									height: 16 * window.devicePixelRatio,
									className: 'knob',
								});
								li.appendChild(knobCanvas);
								const knob = new Knob(
									knobCanvas,
									0,
									2,
									0.01,
									input.volume,
									'volume',
								);
								knob.canvas.style.width = '16px';
								knob.canvas.style.height = '16px';
								knob.canvas.style.float = 'right';
								knob.on('change', (k: { value: number }) => {
									input.volume = k.value;
								});
								knob.emit('change', knob);
							}
							inputs_ul.appendChild(li);
						}
					} else {
						inputs_ul.textContent = '(none)';
					}

					const outputs_ul = document.createElement('ul');
					if (midi.outputs.size > 0) {
						for (let i = 0; i < outs.length; i++) {
							let output = outs[i]
							const li = document.createElement('li') as HTMLLIElement & {
								connectionId: string;
							};
							li.connectionId = output.port.id;
							li.classList.add('connection');
							if (output.enabled) li.classList.add('enabled');
							li.textContent = output.port.name;
							li.addEventListener('click', (evt: Event) => {
								for (let i = 0; i < outs.length; i++) {
									let output = outs[i]
									if (
										output.port.id ===
										(evt.target as HTMLElement & { connectionId: string })
											.connectionId
									) {
										output.enabled = !output.enabled;
										(evt.target as HTMLElement).classList.toggle('enabled');
										updateDevices();
										return;
									}
								}
							});
							if (settings.midiVolumeTest) {
								let knobCanvas = document.createElement('canvas');
								Object.assign(knobCanvas, {
									width: 16 * window.devicePixelRatio,
									height: 16 * window.devicePixelRatio,
									className: 'knob',
								});
								li.appendChild(knobCanvas);
								const knob = new Knob(
									knobCanvas,
									0,
									2,
									0.01,
									output.volume,
									'volume',
								);
								knob.canvas.style.width = '16px';
								knob.canvas.style.height = '16px';
								knob.canvas.style.float = 'right';
								knob.on('change', (k: { value: number }) => {
									output.volume = k.value;
								});
								knob.emit('change', knob);
							}
							outputs_ul.appendChild(li);
						}
					} else {
						outputs_ul.textContent = '(none)';
					}

					outputs_ul.setAttribute('translated', '');
					inputs_ul.setAttribute('translated', '');
					const div = document.createElement('div');
					let h1 = document.createElement('h1');
					h1.textContent = 'Inputs';
					div.appendChild(h1);
					div.appendChild(inputs_ul);
					h1 = document.createElement('h1');
					h1.textContent = 'Outputs';
					div.appendChild(h1);
					div.appendChild(outputs_ul);
					connectionsNotification = new Notification({
						id: 'MIDI-Connections',
						title: 'MIDI Connections',
						duration: sticky ? -1 : 4500,
						html: div,
						target: '#midi-btn',
					});
				}

				plug();

				document.getElementById('midi-btn')!.addEventListener('click', () => {
					if (!document.getElementById('Notification-MIDI-Connections'))
						showConnections(true);
					else connectionsNotification!.close();
				});
			},
			() => {},
		);
	}

	window.onerror = function (_message, _url, _line) {};
}
