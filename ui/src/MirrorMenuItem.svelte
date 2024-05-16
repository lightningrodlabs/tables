<script lang="ts">
  import { createEventDispatcher, getContext } from "svelte";
  import type { TablesStore } from "./store";
  import type { EntryHash } from "@holochain/client";
  import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
  import Participants from "./Participants.svelte";
  // import { MirrorType } from "./mirrorList";
  import { hashEqual } from "./util";

  const dispatch = createEventDispatcher()
  const { getStore } :any = getContext("store");
  let store: TablesStore = getStore();

  export let mirrorHash: EntryHash
  // export let mirrorType: MirrorType
  export let largeDisplay: boolean = false

  let width = 10

  $: mirrorData = store.mirrorList.mirrorData2.get(mirrorHash)
  $: uiProps = store.uiProps

</script>
<div class="wrapper" on:click={()=>{
      dispatch("select")
      }} >
    {#if $mirrorData.status == "complete"}
      {#if !hashEqual($uiProps.tips.get(mirrorHash), $mirrorData.value.tip)}
        <div class="unread"></div>
      {/if}

      <div class="mirror-name">{$mirrorData?.value?.latestState?.name}</div>

      <!-- {#if mirrorType == MirrorType.active}
        <div style="width:100%; display:flex; justify-content:flex-end" bind:clientWidth={width}>
          <Participants board={$mirrorData.value.mirror} max={Math.floor(width/30)}></Participants>
        </div>
      {/if} -->
    {:else if $mirrorData.status == "pending"}
      <sl-skeleton
        effect="pulse"
        style="height: 10px; width: 100%"
        ></sl-skeleton>
    {:else if $mirrorData.status == "error"}
      {$mirrorData.error}
    {/if}
</div>

{#if largeDisplay}
  <div style="display:flex; flex-direction:column; width: 100%">
    <div class="mirror-detail">
      {$mirrorData?.value?.latestState?.variables.length} Variables
    </div>
  </div>
{/if}

<style>
  .unread {
    margin-right: 4px;
    width: 0; 
    height: 0; 
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
    border-left: 10px solid green;
  }

  .wrapper {
    width: 100%;
    border-radius: 50%;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  .mirror-name {
    font-size: 18px;
    font-weight: bold;
    margin-right: 10px;
    height: 25px;
    width: 600px;
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .mirror-detail {
    font-size: 12px;
    font-weight: bold;
    font-style: italic;
  }
</style>