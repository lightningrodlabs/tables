<script lang="ts">
  import '@shoelace-style/shoelace/dist/components/button/button.js';
  import '@shoelace-style/shoelace/dist/components/input/input.js';
  import type SlInput from '@shoelace-style/shoelace/dist/components/input/input.js';
  import { getContext, onMount } from "svelte";
  import { onVisible } from './util';
  import { isWeContext, type WAL, weaveUrlFromWal } from "@lightningrodlabs/we-applet";
  import { ColumnType, type Cell, Board, ColumnDef } from './board';
  import { createEventDispatcher } from "svelte";
  import AttachmentsList from './AttachmentsList.svelte';
  import type { EntryHash } from "@holochain/client";
  import { decodeHashFromBase64 } from "@holochain/client";
  import type { TablesStore } from './store';
  import Avatar from './Avatar.svelte';
  import { stringToColor } from './util';

  import "@holochain-open-dev/profiles/dist/elements/search-agent.js";
  import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";
  import '@lightningrodlabs/we-elements/dist/elements/wal-embed.js';

  import SvgIcon from './SvgIcon.svelte';

  const dispatch = createEventDispatcher()
  const { getStore } :any = getContext("store");
  let store: TablesStore = getStore();

  export let cell;
  export let def;

  let allColumnValues = []
  let searchAgentOpen = false;
  let origValue = ""
  let closing = ""
  let boardHash: EntryHash
  
  // $: allColumnValues = allColumnCells.map((cell:Cell)=>cell?.value)
  $: cellValuePresent = cell?.value !== undefined
  $: boardHash = def.linkedTable ? decodeHashFromBase64(def.linkedTable) : null
  $: boardData = def.linkedTable ? store.boardList.boardData2.get(boardHash) : null
</script>
{#if cell.value}
{#if def.type == ColumnType.WeaveAsset}
  {#if cell.value}
    <AttachmentsList attachments={[cell.value]} allowDelete={false}/>
  {:else}
    null
  {/if}
{:else if def.type == ColumnType.WALEmbed}
  {#if cell.value}
    <div class="iframe-wrapper">
      <wal-embed
        on:click={(e)=>{
          console.log(e)
          e.stopPropagation()
        }}
        class="embed"
        style="margin-top: -35px; margin-left: -8px;"
        src={cell.value}
      >
      </wal-embed>
    </div>
  {:else}
    null
  {/if}
{:else if def.type === ColumnType.TableLink}
  {@const row = $boardData?.value?.latestState?.rows?.find(r => r.id == cell.value)}
  {row?.cells[def.displayColumn]?.value}
{:else if def.type === ColumnType.User}
  <Avatar agentPubKey={decodeHashFromBase64(cell.value)} />
{:else if def.type === ColumnType.Label}
  <!-- background color should be derrived mathematically from value -->
  <div style="font-size: 13px; font-weight: bold; margin: 2px 0; padding: 0 4px; color: black; background-color:{stringToColor(cell.value)}">{cell.value}</div>
{:else}
  {cell.value}
{/if}
{/if}

<style>
  .iframe-wrapper {
    position: relative;
    overflow: hidden;
    padding-top: 12%; /* for 16:9 aspect ratio */
  }
  
  .iframe-wrapper .embed {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none; /* to remove the default iframe border */
  }
</style>