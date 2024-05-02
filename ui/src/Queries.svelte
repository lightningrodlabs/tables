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
import { v1 as uuidv1 } from 'uuid';

export let activeBoard;
export let state;
export let queriedData = {};

let queryBuilder;
// let fields2;
$: fields = $state.columnDefs.map((col) => {
    return {
      name: col.id,
      label: col.name
    }
  })
let newQueryBool = false;
let queryName = "";

// $: state = activeBoard.readableState()
$: queriedData;
$: activeHashB64 = activeBoard.hashB64

let currentQuery = {};
currentQuery[activeHashB64] = "true";

const initialQuery: RuleGroupType = { combinator: 'and', rules: [] };
const queryStore = writable(initialQuery);

function changeQuery(newQuery) {
  currentQuery[activeHashB64] = newQuery
  console.log("new query", newQuery)
  queriedData[activeHashB64] = []
  $state.rows.forEach((row) => {
    if (newQuery.length === 0) {
      queriedData[activeHashB64].push(row.id)
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
        queriedData[activeHashB64].push(row.id)
      }
    }
  })

  console.log("queried data", queriedData[activeHashB64])
}

// Function to handle query changes
function onQueryChange(newQuery) {
  queryStore.set(newQuery);
  console.log(formatQuery(newQuery, 'cel'));
  changeQuery(formatQuery(newQuery, 'cel'));
}

// onMount(() => {
//   fields2 = $state.columnDefs.map((col) => {
//     return {
//       name: col.id,
//       label: col.name
//     }
//   })
//   console.log(fields2)
// });

</script>

<!-- <ReactAdapter
  el={QueryBuilder}
  data={{ fields: fields, query: queryStore, onQueryChange: onQueryChange }}
/> -->


<div style="display: flex; margin: 7px;">

  <button class="new-query"
    on:click={() => 
      {
        // console.log(formatQuery($queryStore, 'cel'))
        newQueryBool = true
      }
    }
  >+ query</button>
  <!-- <div>Queries</div> -->
  <!-- <select
    on:change={(e) => {
      console.log(e.target.value)

    }}
   style="width: 100px"> -->
    {#each $state.queries as q}
      <div
      class="query-button-select"
      class:selected-query={q.query === currentQuery[activeHashB64]}
      on:click={() => {
        if (q.query === currentQuery[activeHashB64]) {
          changeQuery("true")
        } else {

          console.log(q.query)
          newQueryBool = false
          changeQuery(q.query);
        }
      }}
      >
      <div
        class="remove-query"
        on:click={() => {
          activeBoard.requestChanges([{ type: "remove-query", query: q}]);
        }}
      >&times;</div>
      {q.label}
    </div>

    {/each}
    <!-- <option value="new">New</option> -->
  <!-- </select> -->
</div>

{#if fields && newQueryBool}
<div style="display:flex; margin-left: 12px;">
  <input
    bind:value={queryName}
   type="text" placeholder="Query Name" style="width: 100px; margin-right: 4px; background-color: #fbd8ae; border: 0; padding: 4px"/>
  <button class="query-button" on:click={()=>{newQueryBool = false; changeQuery("true")}}>Cancel</button>
  <button class="query-button" on:click={()=>{
    if (queryName === "") {
      queryName = "Query " + $state.queries.length
    }
    activeBoard.requestChanges([{ type: "add-query", query: {label: queryName, query: formatQuery($queryStore, 'cel'), id: uuidv1()}}]);
    newQueryBool = false;
    queryName = "";
  }}>Save</button>
</div>

{#if fields && $state && $state.rows}
  <ReactAdapter 
  el={QueryBuilder}
  fields={fields}
  onQueryChange={onQueryChange} 
  />
{/if}

{/if}
<br>

<!-- <ReactAdapter 
  el={QueryBuilder}
  fields={fields2}
  onQueryChange={onQueryChange} 
/> -->

<style>
  .query-button {
    margin-right: 4px;
    background-color: #fbd8ae;
    border: 0;
    padding: 4px;
    color: #986526;
  }

  .query-button:hover {
    background-color: #fff2e2 !important;
  }

  .query-button-select {
    display: flex;
    margin-left: 6px;
    cursor: pointer;
    border: 1px solid;
    padding: 5px;
    font-weight: bold;
    background-color: #00000078;
  }

  .query-button-select:hover {
    background-color: #fbd8ae46 !important;
  }

  .selected-query {
    background-color: #986526 !important;
    border: 2px solid !important;
    padding: 4px !important;
  }

  .query-button:hover {
    background-color: black;
  }

  .new-query {
    width: 68px;
    padding: 0px;
    font-size: 12px;
    height: 33px;
    background-color: #986526;
    color: white;
    font-weight: bold;
    border: 0;
    border-radius: 2px;
    text-transform: capitalize;
    transition: background-color 0.2s;
  }

  .new-query:hover {
    background-color: #ee9127;
    /* transition */
    transition: background-color 0.2s;
  }

  .remove-query {
    margin-right: 4px;
    font-size: 12px;
    cursor: pointer;
    padding: 0px 5px;
    background-color: transparent;
    border: 1px solid;
    border-radius: 20px;
    height: 20px;
    transition: background-color 0.2s;
  }

  .remove-query:hover {
    background-color: rgba(210, 147, 0, 0.608);
    transition: background-color 0.2s;
  }
</style>