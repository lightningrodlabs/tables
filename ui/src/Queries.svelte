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
export let newQueryBool = false;

let queryBuilder;
// let fields2;
$: fields = $state.columnDefs.map((col) => {
    return {
      name: col.id,
      label: col.name
    }
  })
let queryName = "";

// $: state = activeBoard.readableState()
$: queriedData;
$: activeHashB64 = activeBoard.hashB64

let currentQuery = {};
currentQuery[activeHashB64] = "true";

const initialQuery: RuleGroupType = { combinator: 'and', rules: [] };
const queryStore = writable(initialQuery);

// Safe eval function
function safeEval(expr: string): boolean {
  try {
    return eval(expr);
  } catch (e) {
    return false;
  }
}

function changeQuery(newQuery) {
  currentQuery[activeHashB64] = newQuery
  queriedData[activeHashB64] = []
  $state.rows.forEach((row) => {
    if (newQuery.length === 0) {
      queriedData[activeHashB64].push(row.id)
    } else {
      // for key and value in row.cells
      let subbedQuery = newQuery

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

      if (
        subbedQuery 
        && safeEval(subbedQuery)
      ) {
        queriedData[activeHashB64].push(row?.id)
      }
    }
  })
}

// Function to handle query changes
function onQueryChange(newQuery) {
  queryStore.set(newQuery);
  console.log(formatQuery(newQuery, 'cel'));
  changeQuery(formatQuery(newQuery, 'cel'));
}

function injectColumnNames(query) {
  let newQuery = query;
  $state.columnDefs.forEach((col) => {
    newQuery = newQuery.replace(new RegExp(col.id, 'g'), col.name);
  })
  return newQuery;
}

</script>

<!-- <ReactAdapter
  el={QueryBuilder}
  data={{ fields: fields, query: queryStore, onQueryChange: onQueryChange }}
/> -->

<!-- <div style="margin-left: 68px;"> -->
<div>

  <div style="display: flex; margin: 2px 7px; align-items: center;">

    <button class="new-query"
      on:click={() => 
        {
          newQueryBool = true
        }
      }
    >+ filter</button>

      {#each $state.queries as q}
        <div
        class="query-button-select"
        title={currentQuery[activeHashB64] === q.query ? "Unselect Filter (" + injectColumnNames(q.query) + ")" : "Select Filter (" + injectColumnNames(q.query) + ")"}
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
          title="Remove Query"
          on:click={() => {
            activeBoard.requestChanges([{ type: "remove-query", query: q}]);
          }}
        >-</div>
        {q.label}
      </div>

      {/each}
  </div>

  {#if fields && newQueryBool}
    <div 
      style="margin-left: 81px; border: 1px solid rgb(115 115 115); padding: 10px; background-color: rgb(223 223 223);
        width: {200 * $state.columnDefs.length + 1}px
      "
    >
      <div style="display:flex;">
        <input
          bind:value={queryName}
          type="text" 
          placeholder="Filter name" 
          style="width: 203px; margin-right: 4px; background-color: #fff; border: 0; padding: 4px"
        />
      </div>

      {#if fields && $state && $state.rows}
        <ReactAdapter 
          el={QueryBuilder}
          fields={fields}
          onQueryChange={onQueryChange} 
        />
      {/if}

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
  {/if}
</div>

<style>
  .query-button {
    margin-right: 4px;
    background-color: rgb(136, 136, 136);
    border: 0;
    padding: 4px 8px;
    color: #ffffff;
    border-radius: 2px;
  }

  .query-button:hover {
    background-color: #a4a4a4 !important;
  }

  .query-button-select {
    display: flex;
    margin-left: 6px;
    cursor: pointer;
    border: 1px solid;
    padding: 5px;
    font-weight: bold;
    background-color: #00000078;
    color: white;
  }

  .query-button-select:hover {
    background-color: #dbb63d !important;
  }

  .selected-query {
    background-color: #dbb63d !important;
    border: 2px solid !important;
    padding: 4px !important;
  }

  .query-button:hover {
    background-color: black;
  }

  .new-query {
    padding: 0 8px;
    font-size: 11px;
    height: 20px;
    background-color: rgb(105, 105, 105);
    color: white;
    font-weight: bold;
    border: 0;
    border-radius: 2px;
    text-transform: capitalize;
    transition: background-color 0.2s;
  }

  .new-query:hover {
    background-color: #808080;
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
    width: 20px;
    padding-left: 6.5px;
    transition: background-color 0.2s;
  }

  .remove-query:hover {
    background-color: rgba(140, 98, 0, 0.608);
    transition: background-color 0.2s;
  }
</style>