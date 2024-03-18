<script lang="ts">
  import { createEventDispatcher, getContext } from "svelte";
  import type { TablesStore } from "./store";
  import type { EntryHash } from "@holochain/client";
  import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
  import Participants from "./Participants.svelte";
  import { BoardType } from "./boardList";
  import { hashEqual } from "./util";
  import { onMount } from "svelte";

  const dispatch = createEventDispatcher()
  const { getStore } :any = getContext("store");
  let store: TablesStore = getStore();

  export let boardHash: EntryHash;
  export let keyColumn;
  export let displayColumn;
  export let selectedRow = null

  let width = 10

  $: boardData = store.boardList.boardData2.get(boardHash)
  $: keyColumnObject = boardData
  $: uiProps = store.uiProps

  // onmount
  onMount(async () => {
    setTimeout(() => {
      store.boardList.boardData2.get(boardHash).subscribe((data) => {
        console.log("data", data)
      })
      console.log("boardData", boardData)
    }, 1000);
  });

</script>

<div class="wrapper" on:click={()=>{
      dispatch("select")
      }} >
    {#if $boardData.status == "complete"}
      <!-- select value from keyColumn -->
      <!-- {JSON.stringify($boardData.value.latestState.rows)} -->
      <select bind:value={selectedRow}
      on:change={() => {
        dispatch("select", selectedRow)
      }}>
        {#each $boardData.value.latestState.rows as row}
          {#if Object.keys(row.cells).length > 0}
            {@const keyColumnIndex = $boardData.value.latestState.columnDefs.findIndex(columnDef => columnDef.id == keyColumn)}
            {@const keyColumnValue = Object.values(row.cells)[keyColumnIndex]?.value}
            {@const displayColumnIndex = $boardData.value.latestState.columnDefs.findIndex(columnDef => columnDef.id == displayColumn)}
            {@const displayColumnValues = Object.values(row.cells)}
            {#if displayColumnValues.length > displayColumnIndex}
              {@const displayColumnValue = Object.values(row.cells)[displayColumnIndex].value}
              <option value={row.id}>{
                keyColumnValue + " - " +
                displayColumnValue
              }</option>
            {/if}
          {/if}
        {/each}
      </select>
    {:else if $boardData.status == "pending"}
      <sl-skeleton
        effect="pulse"
        style="height: 10px; width: 100%"
        ></sl-skeleton>
    {:else if $boardData.status == "error"}
      {$boardData.error}
    {/if}
</div>