<script lang="ts">
	import { onMount } from 'svelte';
	import type { Writable } from 'svelte/store';
	import CellDisplay from './CellDisplay.svelte';

	export let value: any;
	export let columnDefs: any;

	onMount(() => {
		console.log('mount', value);

		return () => {
			console.log('unmount', value);
		};
	});
</script>

{#if value}
	<div class="entry">
		{#each columnDefs as columnDef, index}
			{@const cell = Object.values(value.cells)[index]}
			<div class="entry-field">
				<h3>
					{columnDef.name}
				</h3>
				{#if cell}
					<CellDisplay
						{cell}
						def={columnDef}
					/>
				{:else}
					<p>
						No value
					</p>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	.entry {
		padding: 10px;
	}

	.entry-field {
		margin-bottom: 10px;
	}
</style>