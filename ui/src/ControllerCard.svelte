<script lang="ts">
    import { TablesStore } from './store'
    import { setContext } from 'svelte';
    import type { AppAgentClient, EntryHash } from '@holochain/client';
    import type { SynStore } from '@holochain-syn/store';
    import type { ProfilesStore } from "@holochain-open-dev/profiles";
    import type { WeClient } from '@lightningrodlabs/we-applet';
    import CellDisplay from './CellDisplay.svelte';
    import SummaryRow from './SummaryRow.svelte';
    import type { v1 as uuidv1 } from "uuid";

    export let roleName = ""
    export let client : AppAgentClient
    export let weClient : WeClient
    export let profilesStore : ProfilesStore
    export let board : EntryHash
    // export let cardId : uuidv1
    export let context: any;

    let store: TablesStore = new TablesStore (
      weClient,
      profilesStore,
      client,
      roleName,
    );
    let synStore: SynStore = store.synStore
    store.boardList.setActiveBoard(board)
    $: activeBoardHash = store.boardList.activeBoardHash
    $: activeBoard = store.boardList.activeBoard;
    $: state = $activeBoard ? $activeBoard.readableState() : undefined

    setContext('synStore', {
      getStore: () => synStore,
    });

    setContext('store', {
      getStore: () => store,
    });
  
</script>
  <div class="flex-scrollable-parent">
    <div class="flex-scrollable-container">
      <div class='app'>

      <div class="wrapper">

      <div class="workspace" style="display:flex">
        {#if context}
        {#if state && context.assetType == "Column Summary"}
          {@const def = $state.columnDefs.find(c=>c.id == context.columnId)}
          <SummaryRow
            activeBoard={$activeBoard}
            query={context.query ? context.query : "true"}
            sumType={context.sumType}
            def={def}
            width={100}
            embedded={true}
          />
        {:else if state && context.cellId}
          {@const cell = $state.rows.find(c=>c.id == context.cellId.rowId).cells[context.cellId.columnId]}
            <CellDisplay
              cell={cell}
              def={context.def}
            />
          {:else}
            Malformed context
          {/if}
        {:else if $activeBoardHash !== undefined}
          CELL DATA GOES HERE
        {:else}
          Unable to find board.
        {/if}
        </div>
        </div>
    </div>
  </div>
</div>
<style>
  .app {
    margin: 0;
    padding-bottom: 10px;
    background-size: cover;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background-color: #fff;
    height: 100vh;
    position: relative;
  }

  :global(:root) {
    --resizeable-height: 200px;
    --tab-width: 60px;
  }

  @media (min-width: 640px) {
    .app {
      max-width: none;
    }
  }
  @-webkit-keyframes spin {
    0% { -webkit-transform: rotate(0deg); }
    100% { -webkit-transform: rotate(360deg); }
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  .flex-scrollable-parent {
    position: relative;
    display: flex;
    flex: 1;
  }
  .flex-scrollable-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .wrapper {
    position: relative;
    z-index: 10;
  }

</style>
