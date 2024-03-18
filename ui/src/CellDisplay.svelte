<script lang="ts">
  import '@shoelace-style/shoelace/dist/components/button/button.js';
  import '@shoelace-style/shoelace/dist/components/input/input.js';
  import type SlInput from '@shoelace-style/shoelace/dist/components/input/input.js';
  import { getContext, onMount } from "svelte";
  import { hrlWithContextToB64, onVisible } from './util';
  import { ColumnType, type Cell, Board, ColumnDef } from './board';
  import { createEventDispatcher } from "svelte";
  import AttachmentsList from './AttachmentsList.svelte';
  import type { EntryHash } from "@holochain/client";
  import { decodeHashFromBase64 } from "@holochain/client";
  import type { TablesStore } from './store';
  import Avatar from './Avatar.svelte';

  import "@holochain-open-dev/profiles/dist/elements/search-agent.js";
  import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";

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
{:else if def.type === ColumnType.TableLink}
  {@const row = $boardData.value.latestState.rows.find(r => r.id == cell.value)}
  {@const displayColumnIndex = $boardData.value.latestState.columnDefs.findIndex(c => c.id == def.displayColumn)}
  {Object.values(row.cells)[displayColumnIndex].value}
{:else if def.type === ColumnType.User}
  <Avatar agentPubKey={decodeHashFromBase64(cell.value)} />
{:else}
  {cell.value}
{/if}
{/if}