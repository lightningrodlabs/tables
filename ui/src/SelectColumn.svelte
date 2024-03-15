<script lang="ts">
  import { createEventDispatcher, getContext } from "svelte";
  import type { TablesStore } from "./store";
  import type { EntryHash } from "@holochain/client";
  import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
  import Participants from "./Participants.svelte";
  import { BoardType } from "./boardList";
  import { hashEqual } from "./util";

  const dispatch = createEventDispatcher()
  const { getStore } :any = getContext("store");
  let store: TablesStore = getStore();

  export let boardHash: EntryHash
  export let selectedColumn;
  export let uniqueOnly = false;

  let width = 10

  $: boardData = store.boardList.boardData2.get(boardHash)
  $: uiProps = store.uiProps

</script>
<div class="wrapper" on:click={()=>{
      dispatch("select")
      }} >
    {#if $boardData.status == "complete"}
      {#if uniqueOnly}
        {@const uniqueColumns = $boardData.value.latestState.columnDefs.filter(columnDef => columnDef.unique)}
        <select bind:value={selectedColumn}>
          {#each uniqueColumns as columnDef}
            <option value={columnDef.id}>{columnDef.name}</option>
          {/each}
        </select>
      {:else}
        <select bind:value={selectedColumn}>
          {#each $boardData.value.latestState.columnDefs as columnDef}
            <option value={columnDef.id}>{columnDef.name}</option>
          {/each}
        </select>
      {/if}
    {:else if $boardData.status == "pending"}
      <sl-skeleton
        effect="pulse"
        style="height: 10px; width: 100%"
        ></sl-skeleton>
    {:else if $boardData.status == "error"}
      {$boardData.error}
    {/if}
</div>