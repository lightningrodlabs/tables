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

$: state = activeBoard.readableState()
$: fields2, queriedData;

const initialQuery: RuleGroupType = { combinator: 'and', rules: [] };
const queryStore = writable(initialQuery);

// Function to handle query changes
function onQueryChange(newQuery) {
  queryStore.set(newQuery);
  console.log(formatQuery(newQuery, 'cel'));

  queriedData = []
  $state.rows.forEach((row) => {
    if (newQuery.length === 0) {
      queriedData.push(row.id)
    } else {
      // for key and value in row.cells
      let subbedQuery = formatQuery(newQuery, 'cel')

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
        subbedQuery = subbedQuery.replace(new RegExp('contains', 'g'), 'includes');
      })

      if (eval(subbedQuery)) {
        queriedData.push(row.id)
      }
    }
  })

  console.log("queried data", queriedData)
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

{#if fields2}
  <ReactAdapter 
    el={QueryBuilder}
    fields={fields2}
    onQueryChange={onQueryChange} 
  />
{/if}
<!-- <ReactAdapter 
  el={QueryBuilder}
  fields={fields2}
  onQueryChange={onQueryChange} 
/> -->