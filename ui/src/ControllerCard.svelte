<script lang="ts">
    import { TablesStore } from './store'
    import { setContext } from 'svelte';
    import type { AppClient, EntryHash } from '@holochain/client';
    import type { SynStore } from '@holochain-syn/store';
    import type { ProfilesStore } from "@holochain-open-dev/profiles";
    import type { WeClient, WAL } from '@lightningrodlabs/we-applet';
    import CellDisplay from './CellDisplay.svelte';
    import SummaryRow from './SummaryRow.svelte';
    import { getTableValues, getRowValues, getColumnValues, getValueOfCell, getValueOfColumnSummary } from './DataHelpers';
    import type { v1 as uuidv1 } from "uuid";
    import { onMount } from 'svelte';

    export let roleName = ""
    export let client : AppClient
    export let weClient : WeClient
    export let profilesStore : ProfilesStore
    export let wal: WAL;
    // export let cardId : uuidv1

    let store: TablesStore = new TablesStore (
      weClient,
      profilesStore,
      client,
      roleName,
    );
    let currentValue;
    let synStore: SynStore = store.synStore
    store.boardList.setActiveBoard(wal.hrl[1])
    $: context = wal.context
    $: activeBoardHash = store.boardList.activeBoardHash
    $: activeBoard = store.boardList.activeBoard;
    $: state = $activeBoard ? $activeBoard.readableState() : undefined


    async function getWalValue() {
      if (state) {
        switch (wal?.context?.assetType) {
          case "Cell":
            const valueOfCell = await getValueOfCell(wal.hrl[1], wal.context?.cellId?.rowId, wal.context?.cellId?.columnId, store)
            return valueOfCell
            break
          case "Column Summary":
            const valueOfSummary = await getValueOfColumnSummary(wal.hrl[1], wal.context?.columnId, wal.context?.sumType, store, "true")
            return valueOfSummary
            break
          case "Table":
            console.log("table")
            const tableValues = await getTableValues(wal.hrl[1], store)
            return tableValues
            break
          case "Row":
            console.log("row")
            const rowValues = await getRowValues(wal.hrl[1], wal.context?.rowId, store)
            return rowValues
            break
          case "Column":
            console.log("column")
            const columnValues = await getColumnValues(wal.hrl[1], wal.context?.columnId, store)
            return columnValues
            break
          }
      }
    }


    onMount(async () => {
      setTimeout(async () => {
        currentValue = await getWalValue()
      }, 100)
      // loop to get wall values
      // setInterval(async() => {
      //   currentValue = await getWalValue()
      // }, 20000)
    })

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
            <!-- {JSON.stringify($activeBoard)} -->
            {#if state && context.assetType == "Column Summary"}
              {@const def = $state.columnDefs.find(c=>c.id == context.columnId)}
              <SummaryRow
                color={"#000000"}
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
            {:else if state && context.columnId || context.rowId}
              {JSON.stringify(currentValue)}
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
  * {
    color: black;
  }

  .app {
    margin: 0;
    padding-bottom: 10px;
    background-size: cover;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background-color: transparent;
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
