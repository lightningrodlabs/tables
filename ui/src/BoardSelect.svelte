<script lang="ts">
  import { createEventDispatcher, getContext } from "svelte";
  import type { TablesStore } from "./store";
  import type { EntryHash } from "@holochain/client";
  import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
  import Participants from "./Participants.svelte";
  import { BoardType } from "./boardList";
  import { hashEqual } from "./util";
  import { onMount } from "svelte";
  import BoardMenuItem from "./BoardMenuItem.svelte";
  import SelectColumn from "./SelectColumn.svelte";

  // export let boardHash: EntryHash

  const dispatch = createEventDispatcher()
  const { getStore } :any = getContext("store");
  let store: TablesStore = getStore();
  let selectedBoard = null;
  $: selectedBoard;

  let keyColumn = null;
  $: keyColumn;
  let displayColumn = null;
  $: displayColumn;
  $: allBoards = []
  $: activeBoards = store.boardList.activeBoardHashes

  const getBoardName = async (boardHash) => {
    store.mirrorList.mirrorData2.get(boardHash).subscribe((data) => {
      if (data.status == "complete") {
        return data.value.latestState
      }
    })
  }
</script>

{#if $activeBoards.status == "complete" && $activeBoards.value.length > 0}
  <select
    class="form-control"
    id="column-type"
    bind:value={selectedBoard}
  >
    <!-- select board -->
    {#each $activeBoards.value as board}
      <option value={board}>
        <BoardMenuItem boardType={BoardType.archived} boardHash={board}></BoardMenuItem>
      </option>
    {/each}
  </select>
  {#if selectedBoard}
  <div>
    <label for="column">Key field</label>
    <SelectColumn boardHash={selectedBoard} uniqueOnly={true} bind:selectedColumn={keyColumn}></SelectColumn>
  </div>
  <div>
    <label for="column">Display field</label>
    <SelectColumn boardHash={selectedBoard} bind:selectedColumn={displayColumn}></SelectColumn>
  </div>
  {/if}
{/if}