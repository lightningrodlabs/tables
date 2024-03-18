<script lang="ts">
    import { get } from "svelte/store";
  import {Board, ColumnType, SumType } from "./board";
  import { cloneDeep, isEqual } from "lodash";
  export let activeBoard: Board;
  export let width = 0;

  $: state = activeBoard.readableState()

  </script>

<div class="data-row">
  <div style="width:22px; cursor: pointer; border-right: 1px dashed">
  </div>
  {#each $state.columnDefs as def, x}
    <div class="data-cell" style="width:{width}px; background-color: #a9a9a9; color: white;">
        {#if def.sumType == SumType.Sum}
          {@const sum = Object.values($state.rows).reduce((acc, row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return acc + Number(cell.value);
            }
            return acc;
          }, 0)}
          {sum}
        {:else if def.sumType == SumType.Average}
          {@const sum = Object.values($state.rows).reduce((acc, row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return acc + Number(cell.value);
            }
            return acc;
          }, 0)}
          {parseFloat((sum / Object.values($state.rows).length).toFixed(10))}
        {:else if def.sumType == SumType.Count}
          {Object.values($state.rows).filter(row => row.cells[def.id] && row.cells[def.id].value).length}
        {:else if def.sumType == SumType.Max}
          {@const value = Object.values($state.rows).reduce((acc, row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              if (def.type == ColumnType.Date) {
                let dateNumber = new Date(cell.value).getTime();
                if (dateNumber) {
                  return Math.max(acc, dateNumber);
                }
              } else {
                console.log(Math.max(acc, Number(cell.value)))
                return Math.max(acc, Number(cell.value));
              }
            }
            return acc;
          }, 
            Number.NEGATIVE_INFINITY
          )}
          {def.type == ColumnType.Date && value > Number.NEGATIVE_INFINITY ? new Date(value)
            .toISOString().split('T')[0] : value}
        {:else if def.sumType == SumType.Min}
          {@const value = Object.values($state.rows).reduce((acc, row) => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              console.log(cell.value)
              if (def.type == ColumnType.Date) {
                let dateNumber = new Date(cell.value).getTime();
                if (dateNumber) {
                  return Math.min(acc, dateNumber);
                }
              }
              return Math.min(acc, Number(cell.value));
            }
            return acc;
          }, 
            Number.POSITIVE_INFINITY
          )}
          {def.type == ColumnType.Date && value < Number.POSITIVE_INFINITY ? new Date(value)
            .toISOString().split('T')[0] : value}
        {:else if def.sumType == SumType.Median}
          {@const values = Object.values($state.rows).map(row => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return Number(cell.value);
            }            
          }).sort((a, b) => a - b).filter(value => value !== undefined)}

          {values[Math.floor(values.length / 2)]}
        {:else if def.sumType == SumType.Mode}
          {@const values = Object.values($state.rows).map(row => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return Number(cell.value);
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
        {:else if def.sumType == SumType.Range}
          {@const values = Object.values($state.rows).map(row => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return Number(cell.value);
            }
          }).sort((a, b) => a - b).filter(value => value !== undefined)}
          {values[values.length - 1] - values[0]}
        {:else if def.sumType == SumType.StDeviation}
          {@const values = Object.values($state.rows).map(row => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return Number(cell.value);
            }
          }).filter(value => value !== undefined)}
          {@const mean = values.reduce((acc, value) => acc + value, 0) / values.length}
          {parseFloat(Math.sqrt(values.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) / values.length).toFixed(10))}
        {:else if def.sumType == SumType.Filled}
          {parseFloat((Object.values($state.rows).filter(row => row.cells[def.id] && row.cells[def.id].value).length / Object.values($state.rows).length * 100).toFixed(8))}%
        {:else if def.sumType == SumType.Empty}
          {parseFloat((Object.values($state.rows).filter(row => !row.cells[def.id] || !row.cells[def.id].value).length / Object.values($state.rows).length * 100).toFixed(8))}%
        {:else if def.sumType == SumType.Unique}
          {@const values = Object.values($state.rows).map(row => {
            const cell = row.cells[def.id];
            if (cell && cell.value) {
              return cell.value;
            }
          })}
          {parseFloat((new Set(values).size / values.length * 100).toFixed(8))}%
        {:else}
          &nbsp;--
        {/if}
        <div style="float: right; color: white;">
          {SumType[def.sumType]}
        {#if def.type == ColumnType.Number}
          <select
            style="width: 17px;"
            bind:value={def.sumType}
            on:change={(e)=>{
              const columnDefs = cloneDeep($state.columnDefs);
              columnDefs[x].sumType = e.target.value;
              activeBoard.requestChanges([{ type: "set-column-defs",  "columnDefs": columnDefs}]);
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
        {:else if def.type == ColumnType.String || def.type == ColumnType.Date || def.type == ColumnType.Email || def.type == ColumnType.WeaveAsset || def.type == ColumnType.TableLink}
          <select
            style="width: 17px;"
            bind:value={def.sumType}
            on:change={(e)=>{
              const columnDefs = cloneDeep($state.columnDefs);
              columnDefs[x].sumType = e.target.value;
              activeBoard.requestChanges([{ type: "set-column-defs",  "columnDefs": columnDefs}]);
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
    </div>
  {/each}
</div>


<style>

.data-row {
    display:flex;
    /* border-bottom: 1px dashed; */
    width: fit-content;
  }
  .data-cell, .header-cell {
    padding-right: 2px;
    padding-left: 2px;
    border-right: 1px dashed;
    border-bottom: 1px dashed;
    overflow: hidden;
    text-overflow: ellipsis;
  }

</style>