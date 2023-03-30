<script lang="ts">
	import type { CreateCompletionResponse } from 'openai';
	import { onMount } from 'svelte';
	import { nanoid } from 'nanoid';
	import { SSE } from 'sse.js';

	let recognition: SpeechRecognition | null;
	let support: boolean = true;
	let messages = new Map<string, { question: string; answer: string }>();
	let currentId: string;
	let context: string;
	let recording = false;

	onMount(() => {
		try {
			let SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
			recognition = new SpeechRecognition();
			recognition.lang = 'en-US';
			support = true;

			// setup recognition
			recognition.onresult = function (event) {
				console.log('currentId', currentId);

				if (!currentId) return;

				let current = event.resultIndex;
				let transcript = event.results[current][0].transcript;

				messages.set(currentId, { question: transcript, answer: '' });
				console.log(transcript);
			};

			recognition.onend = function () {
				if (currentId) {
					interactiveWithChatGPT(messages.get(currentId)?.question as string);
				}

				messages = messages;
				currentId = '';
			};
		} catch (e: unknown) {
			support = false;
			console.error(e);
		}

		return () => {
			recognition = null;
		};
	});

	function onVoiceBtnTap() {
		recording = true;
		recognition?.start();

		currentId = nanoid(7);
	}

	function onStopRecordingBtnTap() {
		recording = false;
		recognition?.stop();
	}

	async function onSendBtnTap() {
		currentId = nanoid(7);
		messages.set(currentId, { question: context, answer: '' });

		interactiveWithChatGPT(context);
		messages = messages;

		context = '';
	}

	let error;
	let loading;
	let answer: string;
	function interactiveWithChatGPT(context: string) {
		const eventSource = new SSE('/api/explain', {
			headers: {
				'Content-Type': 'application/json'
			},
			payload: JSON.stringify({ context })
		});

		eventSource.addEventListener('error', (e: any) => {
			error = true;
			loading = false;
		});

		eventSource.addEventListener('message', (e: any) => {
			try {
				loading = false;

				if (e.data === '[DONE]') {
					answer = '';
					return;
				}

				const completionResponse: CreateCompletionResponse = JSON.parse(e.data);

				const [{ text }] = completionResponse.choices;
				answer = (answer ?? '') + text;
				messages.set(currentId, {
					...(messages.get(currentId) as any),
					answer
				});

				// for reactive purpose
				messages = messages;
			} catch (err) {
				error = true;
				loading = false;
				console.error(err);
			}
		});

		eventSource.stream();
	}

	function onKeyPressed(event: KeyboardEvent) {
		if (event.key === 'Enter' && context) onSendBtnTap();
	}

	$: messageList = Array.from(messages, (entry) => {
		return entry[1];
	});
</script>

<svelte:window on:keypress={onKeyPressed} />

{#if support}
	<div class="flex flex-col gap-2 p-2.5 mb-[4.7rem]">
		{#each messageList as m}
			<div class="flex flex-col gap-2">
				<div class="flex justify-end ml-3.5">
					<div class="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-200">{m.question}</div>
				</div>
				<div class="flex mr-3.5">
					<div class="px-3 py-1.5 rounded-lg border border-gray-300">{m.answer}</div>
				</div>
			</div>
		{/each}
	</div>
	{#if recording}
		<div
			class="bg-white fixed bottom-0 left-0 right-0 flex flex-col items-center p-8 gap-4 border-t border-gray-200 shadow-t-sm"
		>
			<div class="waveform">
				<span />
				<span />
				<span />
				<span />
				<span />
			</div>
			<button class="p-4 rounded-full bg-red-500 shadow-md" on:click={onStopRecordingBtnTap}>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18"
					><path fill="none" d="M0 0h24v24H0z" /><path
						d="M7 7v10h10V7H7zM6 5h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
						fill="rgba(255,255,255,1)"
					/></svg
				>
			</button>
		</div>
	{:else}
		<div class="fixed bottom-0 left-0 right-0 h-[4.5rem] flex items-center px-4 gap-4">
			<input
				type="text"
				name="context"
				class="flex-1 border border-gray-200 rounded-2xl px-4 py-1.5"
				bind:value={context}
			/>
			<button class="p-4 rounded-full bg-red-500" on:click={onVoiceBtnTap}>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18"
					><path fill="none" d="M0 0h24v24H0z" /><path
						d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zm0-2a5 5 0 0 1 5 5v6a5 5 0 0 1-10 0V6a5 5 0 0 1 5-5zM2.192 13.962l1.962-.393a8.003 8.003 0 0 0 15.692 0l1.962.393C20.896 18.545 16.85 22 12 22s-8.896-3.455-9.808-8.038z"
						fill="rgba(255,255,255,1)"
					/></svg
				>
			</button>
			<button on:click={onSendBtnTap}>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18"
					><path fill="none" d="M0 0h24v24H0z" /><path
						d="M1.923 9.37c-.51-.205-.504-.51.034-.689l19.086-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.475.553-.717.07L11 13 1.923 9.37zm4.89-.2l5.636 2.255 3.04 6.082 3.546-12.41L6.812 9.17z"
					/></svg
				>
			</button>
		</div>
	{/if}
{:else}
	<h3 class="font-semibold font-2xl">
		Sorry, Your Browser Doesn't Support the Web Speech API. Try Opening This Demo In Google Chrome
		latest version.
	</h3>
{/if}

<style>
	.waveform {
		position: relative;
		margin-bottom: 28px;
		margin-left: -44px;
	}
	.waveform span {
		display: block;
		bottom: 0px;
		width: 3px;
		height: 5px;
		background: red;
		position: absolute;
		animation: audio-wave 1.5s infinite ease-in-out;
	}

	.waveform span:nth-child(2) {
		left: 11px;
		animation-delay: 0.2s;
	}

	.waveform span:nth-child(3) {
		left: 22px;
		animation-delay: 0.4s;
	}

	.waveform span:nth-child(4) {
		left: 33px;
		animation-delay: 0.6s;
	}

	span:nth-child(5) {
		left: 44px;
		animation-delay: 0.8s;
	}

	@keyframes audio-wave {
		0% {
			height: 5px;
			transform: translateY(0px);
			background: red;
		}
		25% {
			height: 40px;
			transform: translateY(20px);
			background: red;
		}
		/*effect is to animate the height of each span from 5px to 30px*/
		/*translateY makes Y axis move down to give the effect that it is growing from the center*/

		50% {
			height: 5px;
			transform: translateY(0px);
			background: red;
		}
		100% {
			height: 5px;
			transform: translateY(0px);
			background: red;
		}
	}
</style>
