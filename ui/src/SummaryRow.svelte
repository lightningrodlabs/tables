<script lang="ts">
  import { get } from "svelte/store";
  import {Board, ColumnType, ColumnDef, SumType } from "./board";
  import { getContext, onMount, createEventDispatcher } from "svelte";
  import { cloneDeep, isEqual } from "lodash";
  import type { TablesStore } from './store';
  import SvgIcon from './SvgIcon.svelte';
  import type { HrlWithContext } from '@lightningrodlabs/we-applet';
  export let activeBoard: Board;
  export let width = 0;
  export let def: ColumnDef;
  export let embedded = false;
  export let query = "true";
  export let sumType;
  export let color = "#c2c2c2";

  const { getStore } :any = getContext("store");
  let store: TablesStore = getStore();
  const dispatch = createEventDispatcher()

  const copyWalToPocket = (columnId) => {
    console.log("copyWalToPocket", activeBoard.hashB64)
    const attachment: HrlWithContext = { hrl: [store.dnaHash, activeBoard.hash], context: {columnId: columnId, query: query, sumType: sumType, assetType: "Column Summary"} }
    console.log("attachment", attachment)
    store.weClient?.walToPocket(attachment)
  }

  $: state = activeBoard.readableState()
  $: x = Number($state.columnDefs.findIndex(c => c.id == def.id))
  let querriedData = []
  $: if ($state && $state.rows) {
    querriedData = $state.rows.filter(row => {
      let subbedQuery = query
      Object.keys(row.cells).forEach((cellId) => {
        let value: any = '"' + row.cells[cellId]?.value + '"'
        if ($state.columnDefs.find((col) => col.id === cellId)?.type === 1) {
          const tempValue = parseInt(row.cells[cellId]?.value)
          if (!isNaN(tempValue)) {
            value = tempValue
          }
        }
        subbedQuery = subbedQuery.replace(new RegExp(cellId, 'g'), value);
        subbedQuery = subbedQuery.replace(new RegExp('contains', 'g'), 'includes');
      })
      try {
        return eval(subbedQuery) ? true : false
      } catch {
        return false
      }
    })
  }

  </script>

<!-- <div class="data-row">
  <div style="width:22px; cursor: pointer; border-right: 1px dashed">
  </div>
  {#each $state.columnDefs as def, x} -->
    <div class:column-summary={!embedded} style="width:{width}px; color: {color}">
      {#if store.weClient && !embedded}
        <button class="copyWal" title="Add this card to pocket" on:click={()=>copyWalToPocket(def.id)}>
          <SvgIcon color="#c2c2c2" icon=addToPocket size="25px"/>
        </button>
      {/if}
        
        {#if sumType == SumType.Sum}
          {@const sum = Object.values(querriedData).reduce((acc, row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return acc + Number(cell.value.replace(/[^0-9-.]/g, ''));
            }
            return acc;
          }, 0)}
          {sum}
        {:else if sumType == SumType.Average}
          {@const sum = Object.values(querriedData).reduce((acc, row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return acc + Number(cell.value.replace(/[^0-9-.]/g, ''));
            }
            return acc;
          }, 0)}
          {parseFloat((sum / Object.values(querriedData).length).toFixed(10))}
        {:else if sumType == SumType.Count}
          {Object.values(querriedData).filter(row => row.cells[def.id] && row.cells[def.id].value).length}
        {:else if sumType == SumType.Max}
          {@const value = Object.values(querriedData).reduce((acc, row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              if (def.type == ColumnType.Date) {
                let dateNumber = new Date(cell.value).getTime();
                if (dateNumber) {
                  return Math.max(acc, dateNumber);
                }
              } else {
                console.log(Math.max(acc, Number(cell.value)))
                return Math.max(acc, Number(cell.value.replace(/[^0-9-.]/g, '')));
              }
            }
            return acc;
          }, 
            Number.NEGATIVE_INFINITY
          )}
          {def.type == ColumnType.Date && value > Number.NEGATIVE_INFINITY ? new Date(value)
            .toISOString().split('T')[0] : value}
        {:else if sumType == SumType.Min}
          {@const value = Object.values(querriedData).reduce((acc, row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              console.log(cell.value)
              if (def.type == ColumnType.Date) {
                let dateNumber = new Date(cell.value).getTime();
                if (dateNumber) {
                  return Math.min(acc, dateNumber);
                }
              }
              return Math.min(acc, Number(cell.value.replace(/[^0-9-.]/g, '')));
            }
            return acc;
          }, 
            Number.POSITIVE_INFINITY
          )}
          {def.type == ColumnType.Date && value < Number.POSITIVE_INFINITY ? new Date(value)
            .toISOString().split('T')[0] : value}
        {:else if sumType == SumType.Median}
          {@const values = Object.values(querriedData).map(row => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return Number(cell.value.replace(/[^0-9-.]/g, ''));
            }            
          }).sort((a, b) => a - b).filter(value => value !== undefined)}

          {values[Math.floor(values.length / 2)]}
        {:else if sumType == SumType.Mode}
          {@const values = Object.values(querriedData).map(row => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return Number(cell.value.replace(/[^0-9-.]/g, ''));
            }
          }).filter(value => value !== undefined)}
          {@const counts = values.reduce((acc, value) => {
            if (acc[value]) {
              acc[value]++;
            } else {
              acc[value] = 1;
            }
            return acc;
          }, {})}
          {@const max = Math.max(...Object.values(counts))}
          {Object.keys(counts).filter(key => counts[key] === max).join(", ")}
        {:else if sumType == SumType.Range}
          {@const values = Object.values(querriedData).map(row => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return Number(cell.value.replace(/[^0-9-.]/g, ''));
            }
          }).sort((a, b) => a - b).filter(value => value !== undefined)}
          {values[values.length - 1] - values[0]}
        {:else if sumType == SumType.StDeviation}
          {@const values = Object.values(querriedData).map(row => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return Number(cell.value.replace(/[^0-9-.]/g, ''));
            }
          }).filter(value => value !== undefined)}
          {@const mean = values.reduce((acc, value) => acc + value, 0) / values.length}
          {parseFloat(Math.sqrt(values.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) / values.length).toFixed(10))}
        {:else if sumType == SumType.Filled}
          {parseFloat((Object.values(querriedData).filter(row => row.cells[def.id] && row.cells[def.id].value).length / Object.values(querriedData).length * 100).toFixed(8))}%
        {:else if sumType == SumType.Empty}
          {parseFloat((Object.values(querriedData).filter(row => !row.cells[def.id] || !row.cells[def.id].value).length / Object.values(querriedData).length * 100).toFixed(8))}%
        {:else if sumType == SumType.Unique}
          {@const values = Object.values(querriedData).map(row => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return cell.value;
            }
          })}
          {parseFloat((new Set(values).size / values.length * 100).toFixed(8))}%
        {:else}
          &nbsp;--
        {/if}

        {#if !embedded}
          <div style="float: right; color: #c2c2c2; margin: 2px;">
            {SumType[sumType]}
          {#if def.type == ColumnType.Number || def.type == ColumnType.Currency}
            <select
              style="width: 15px;"
              bind:value={sumType}
              on:change={(e)=>{
                const columnDefs = cloneDeep($state.columnDefs);
                columnDefs[x].sumType = e.target.value;
                console.log(columnDefs[x].sumType)
                if (query == "true") {
                  console.log("query is true")
                  activeBoard.requestChanges([{ type: "set-column-defs",  "columnDefs": columnDefs}]);
                } else {
                  console.log("query is not true", e.target.value)
                  dispatch("set-sumtype", e.target.value)
                }
              }}
              >Sum
              <option value={SumType.None}>None</option>
              <option value={SumType.Sum}>Sum</option>
              <option value={SumType.Average}>Average</option>
              <option value={SumType.Count}>Count</option>
              <option value={SumType.Max}>Max</option>
              <option value={SumType.Min}>Min</option>
              <option value={SumType.Median}>Median</option>
              <option value={SumType.Mode}>Mode</option>
              <option value={SumType.Range}>Range</option>
              <option value={SumType.StDeviation}>Standard Deviation</option>
              <!-- <option value={SumType.Variance}>Variance</option> -->
              <!-- <option value={SumType.Percentile}>Percentile</option> -->
              <option value={SumType.Filled}>Percent Filled</option>
              <option value={SumType.Empty}>Percent Empty</option>
              <option value={SumType.Unique}>Percent Unique</option>
            </select>
          {:else if [ColumnType.String, ColumnType.Date, ColumnType.Email, ColumnType.WeaveAsset, ColumnType.TableLink, ColumnType.Label, ColumnType.WALEmbed].includes(def.type)}
            <select
              style="width: 15px;"
              bind:value={sumType}
              on:change={(e)=>{
                const columnDefs = cloneDeep($state.columnDefs);
                columnDefs[x].sumType = e.target.value;
                if (query == "true") {
                  console.log("query is true")
                  activeBoard.requestChanges([{ type: "set-column-defs",  "columnDefs": columnDefs}]);
                } else {
                  console.log("query is not true", e.target.value)
                  dispatch("set-sumtype", e.target.value)
                }
              }}
              >
              <option value={SumType.None}>None</option>
              <option value={SumType.Count}>Count</option>
              <option value={SumType.Filled}>Percent Filled</option>
              <option value={SumType.Empty}>Percent Empty</option>
              <option value={SumType.Unique}>Percent Unique</option>
              {#if def.type == ColumnType.Date}
                <option value={SumType.Min}>Min</option>
                <option value={SumType.Max}>Max</option>
              {/if}
            </select>
          {:else}
          {/if}
        </div>
        {/if}
    </div>
  <!-- {/each}
</div> -->

<style>

  .data-row {
    display:flex;
    /* border-bottom: 1px dashed; */
    width: fit-content;
  }
  .column-summary, .header-cell {
    padding-right: 2px;
    padding-left: 2px;
    border-right: 1px solid;
    border-bottom: 1px solid;
    overflow: hidden;
    text-overflow: ellipsis;
    background-color: #a9a9a9; 
    color: white;
  }

  .column-summary {
    /* background-color: #964d08;
    border: 1px solid rgb(108, 53, 1); */
    background-color: #909090;
    border: 1px solid rgb(97, 97, 97);
  }

  select {
    background-color: #c2c2c2;
    color: #ece0cc;
    border: none;
    height: 18px;
    padding: 0;
  }

  .copyWal {
    height: 26px;
    border: none;
    border-radius: 100%;
    background-color: transparent;
    cursor: pointer;
    padding: 0;
  }

  .copyWal:hover {
    background-color: #b9b9b9;
  }

</style>