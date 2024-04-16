<script lang="ts">
import { useState } from 'react';
import type { RuleGroupType } from 'react-querybuilder';
import { QueryBuilder } from 'react-querybuilder';
// import { fields } from './fields';
import 'react-querybuilder/dist/query-builder.scss';
import { onDestroy, onMount } from "svelte";
import { writable } from 'svelte/store';
import ReactAdapter from './ReactAdapter.svelte';
import { formatQuery } from 'react-querybuilder'; // Import the formatQuery function

export let activeBoard;
export let queriedData = [];

let queryBuilder;
let fields2;
let newQueryBool = false;
let queryName = "";

$: state = activeBoard.readableState()
$: fields2, queriedData;

const initialQuery: RuleGroupType = { combinator: 'and', rules: [] };
const queryStore = writable(initialQuery);

function changeQuery(newQuery) {
  console.log("new query", newQuery)
  queriedData = []
  $state.rows.forEach((row) => {
    console.log("hh")
    if (newQuery.length === 0) {
      queriedData.push(row.id)
    } else {
      console.log("jjk")
      // for key and value in row.cells
      let subbedQuery = newQuery
      // console.log("subbedQuery", subbedQuery)

      Object.keys(row.cells).forEach((cellId) => {
        console.log("cellId", cellId)
        let value: any = '"' + row.cells[cellId]?.value + '"'

        console.log($state.columnDefs.find((col) => col.id === cellId)?.type)

        if ($state.columnDefs.find((col) => col.id === cellId)?.type === 1) {
          const tempValue = parseInt(row.cells[cellId]?.value)
          if (!isNaN(tempValue)) {
            value = tempValue
          }
        }
        
        subbedQuery = subbedQuery.replace(new RegExp(cellId, 'g'), value);
        console.log("subbedQuery", subbedQuery, value, cellId)
        subbedQuery = subbedQuery.replace(new RegExp('contains', 'g'), 'includes');
      })

      console.log("subbedQuery", subbedQuery)
      if (eval(subbedQuery)) {
        queriedData.push(row.id)
      }
    }
  })

  console.log("queried data", queriedData)
}

// Function to handle query changes
function onQueryChange(newQuery) {
  queryStore.set(newQuery);
  console.log(formatQuery(newQuery, 'cel'));
  changeQuery(formatQuery(newQuery, 'cel'));
}

onMount(() => {
  fields2 = $state.columnDefs.map((col) => {
    return {
      name: col.id,
      label: col.name
    }
  })
  console.log(fields2)
});

</script>

<!-- <ReactAdapter
  el={QueryBuilder}
  data={{ fields: fields, query: queryStore, onQueryChange: onQueryChange }}
/> -->


<div style="display: flex; margin: 7px;">
  <!-- <div>Queries</div> -->
  <!-- <select
    on:change={(e) => {
      console.log(e.target.value)

    }}
   style="width: 100px"> -->
    {#each $state.queries as q}
      <div
        on:click={() => {
          console.log(q.query)
          newQueryBool = false
          changeQuery(q.query);
        }}
        style="margin-left: 6px; cursor: pointer; border: 1px solid; padding: 5px;"
      >{q.label}
    </div>
    <div
      style="margin-right: 10px; cursor: pointer; padding: 5px;"
      on:click={() => {
        activeBoard.requestChanges([{ type: "remove-query", query: q}]);
      }}
    >&times;</div>
    {/each}
    <!-- <option value="new">New</option> -->
  <!-- </select> -->
  <button style="width: 100px; margin-left: 10px;"
  on:click={() => 
  {
    // console.log(formatQuery($queryStore, 'cel'))
    newQueryBool = true
  }
}
  >+ new query</button>
</div>

{#if fields2 && newQueryBool}
<div style="display:flex;">
  <input
    bind:value={queryName}
   type="text" placeholder="Query Name" style="width: 100px;"/>
  <button on:click={()=>{newQueryBool = false; changeQuery(true)}}>Cancel</button>
  <button on:click={()=>{
    activeBoard.requestChanges([{ type: "add-query", query: {label: queryName, query: formatQuery($queryStore, 'cel')}}]);
  }}>Save</button>
</div>

<ReactAdapter 
el={QueryBuilder}
fields={fields2}
onQueryChange={onQueryChange} 
/>

{/if}
<br>

<!-- <ReactAdapter 
  el={QueryBuilder}
  fields={fields2}
  onQueryChange={onQueryChange} 
/> -->