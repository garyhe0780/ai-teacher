<script lang="ts">
	import type { CreateCompletionResponse } from 'openai';
	import { onMount } from 'svelte';
	import { nanoid } from 'nanoid';
	import { SSE } from 'sse.js'

	let recognition: SpeechRecognition | null;
	let support: boolean = true;
	let messages = new Map<string, { question: string; answer: string }>();
	let currentId: string;
	let context:string;

	onMount(() => {
		try {
			let SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
			recognition = new SpeechRecognition();
			support = true;

			// setup recognition
			recognition.onresult = function (event) {
				if (!currentId) return;

				let current = event.resultIndex;
				let transcript = event.results[current][0].transcript;

				messages.set(currentId, { question: transcript, answer: '' });
				console.log(transcript);
			};

			recognition.onend = function (event) {
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
		recognition?.start();


		currentId = nanoid(7);

		setTimeout(() => {
			recognition?.stop();
		}, 10000);
	}

	async function onSendBtnTap() {
		currentId = nanoid(7)
		messages.set(currentId, { question: context, answer: ''});


		interactiveWithChatGPT(context)
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
		})

		eventSource.addEventListener('error', (e: any) => {
			error = true
			loading = false
		})

		eventSource.addEventListener('message', (e: any) => {
			try {
				loading = false

				if (e.data === '[DONE]') {
					answer = '';
					return
				}

				const completionResponse: CreateCompletionResponse = JSON.parse(e.data)

				const [{ text }] = completionResponse.choices
				answer = (answer ?? '') + text
				messages.set(currentId, {
					...(messages.get(currentId) as any),
					answer
				})

				// for reactive purpose
				messages = messages
			} catch (err) {
				error = true
				loading = false
				console.error(err)
			}
		})

		eventSource.stream()
	}

	$: messageList = Array.from(messages, (entry) => {
		return entry[1];
	});
</script>

{#if support}
	<div class="flex flex-col gap-2 p-2.5">
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
{:else}
	<h3 class="font-semibold font-2xl">
		Sorry, Your Browser Doesn't Support the Web Speech API. Try Opening This Demo In Google Chrome
		latest version.
	</h3>
{/if}
