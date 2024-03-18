<script lang="ts">
  import type { LayoutConfig } from 'golden-layout';
	import Entry from './Entry.svelte';
  import 'svelte-golden-layout/css/themes/goldenlayout-light-theme.css';

  import GoldenLayout from 'svelte-golden-layout';

  export let state: any;
  // ... import a Test component

  const components = { Entry };

  $: layout = {
    root: {
      type: 'row',
      content: state.rows.map(row => {
        return {
          type: 'component',
          componentType: 'Entry',
          componentState: {
            value: row,
          }
        }
      })
    },
  };

</script>

{#if layout}

<div class="layout-container">
  <GoldenLayout config={layout} let:componentType let:componentState>
    <svelte:component this={components[componentType]} {...componentState} columnDefs={state.columnDefs} />
  </GoldenLayout>
</div>

{/if}

<style>
  .layout-container {
    width: 100vw;
    height: 100vh;

    /* margin: 150px auto; */
    /* border: 1px solid black; */
  }
</style>