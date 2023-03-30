<script lang="ts">
	import { onMount } from 'svelte';

	let welcomeText = '';
	let i = 0;
	onMount(() => {
		const words = '欢迎来到英语训练助手, 请选择你想到训练的项目:';
		const timer = setInterval(() => {
			welcomeText += words.at(i);
			i++;

			if (i === words.length) clearInterval(timer);
		}, 300);

		return () => {
			clearInterval(timer);
		};
	});
</script>

<div class="flex flex-col items-center">
	<pre id="terminal">
		<span>{welcomeText}</span>
		<span id="cursor" class="cursor">&nbsp;</span>
	</pre>
	<pre id="editor" />
	<pre id="stats" />
</div>
