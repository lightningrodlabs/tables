<script lang="ts">

  import '@shoelace-style/shoelace/dist/components/drawer/drawer.js';
  import { getContext } from 'svelte';
  import type { TablesStore } from './store';

  import RowDetails from "./RowDetails.svelte";
  import type { RowId } from './board';

  const { getStore } :any = getContext("store");
  let store: TablesStore = getStore();

  let rowId:RowId = ""

  let dialog
  let details: RowDetails
    
  export const open = (id: RowId)=>{
    rowId = id
    dialog.show()
  }

  export const reset = ()=>{
    dialog.hide()
    details.reset()
  }

</script>
<sl-drawer class="edit-card" bind:this={dialog}
  style="--size:500px"
  no-header
  on:sl-hide={()=>close()}
  >
  <RowDetails bind:this={details} rowId={rowId} />
</sl-drawer>
<style>
  .edit-card::part(base) {
    height: calc(100vh - 97px);
    bottom: 0;
    top: initial;
    z-index: 150;
  }

  .edit-card::part(body) {
    padding: 0;
  }

  .edit-card::part(panel) {
    box-shadow: 0px 10px 15px rgba(35, 32, 74, 0.2);
  }

  .edit-card::part(overlay) {
    display: none;
  }

</style>
