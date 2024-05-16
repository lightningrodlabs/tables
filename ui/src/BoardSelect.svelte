<script lang="ts">
  import { createEventDispatcher, getContext } from "svelte";
  import type { TablesStore } from "./store";
  import type { EntryHash } from "@holochain/client";
  import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
  import Participants from "./Participants.svelte";
  import { BoardType } from "./boardList";
  import { hashEqual } from "./util";
  import { onMount } from "svelte";

  // export let boardHash: EntryHash

  const dispatch = createEventDispatcher()
  const { getStore } :any = getContext("store");
  let store: TablesStore = getStore();
  $: allBoards = []
  $: activeBoards = store.boardList.activeBoardHashes

  const getBoardName = async (boardHash) => {
    store.mirrorList.mirrorData2.get(boardHash).subscribe((data) => {
      if (data.status == "complete") {
        console.log("output", data.value.latestState)
        // console.log("output", data.value.latestState.name)
        return data.value.latestState
      }
    })
  }

  onMount(() => {
    store.boardList.fetchActiveBoards().then(() => {
      store.boardList.activeBoardHashes.subscribe(async (activeBoards) => {
        if (activeBoards.status == "complete") {
          const promises = activeBoards.value.map(boardHash => getBoardName(boardHash));
          allBoards = await Promise.all(promises);
        }
      });
    });
  });
</script>

{#if $activeBoards.status == "complete"}
  <select>
    {#each allBoards as board}
      <option value={board}>{getBoardName(board)}</option>
    {/each}
  </select>
  {/if}