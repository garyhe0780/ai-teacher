<script lang="ts">
	import VoiceRecognition from "./VoiceRecognition.svelte"
	import Welcome from "./Welcome.svelte";

	let welcoming = false;
</script>


<main>
	{#if welcoming}
		<Welcome />
	{:else}
  	<VoiceRecognition />
	{/if}
</main>
