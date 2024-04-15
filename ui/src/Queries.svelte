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

let queryBuilder;
let fields2;

$: state = activeBoard.readableState()
$: fields2;

const initialQuery: RuleGroupType = { combinator: 'and', rules: [] };
const fields = [
    {
      name: 'firstName',
      label: 'First Name',
      placeholder: 'Enter first name',
    },
    {
      name: 'lastName',
      label: 'Last Name',
      placeholder: 'Enter last name',
      defaultOperator: 'beginsWith',
    },
    {
      name: 'isMusician',
      label: 'Is a musician',
      valueEditorType: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'instrument',
      label: 'Primary instrument',
      valueEditorType: 'select',
      defaultValue: 'Cowbell',
    },
    {
      name: 'alsoPlays',
      label: 'Also plays',
      valueEditorType: 'multiselect',
      defaultValue: 'More cowbell',
    },
    {
      name: 'gender',
      label: 'Gender',
      valueEditorType: 'radio',
      values: [
        { name: 'M', label: 'Male' },
        { name: 'F', label: 'Female' },
        { name: 'O', label: 'Other' },
      ],
    },
    { name: 'description', label: 'Description', valueEditorType: 'textarea' },
    { name: 'birthdate', label: 'Birth Date', inputType: 'date' },
    { name: 'datetime', label: 'Show Time', inputType: 'datetime-local' },
    { name: 'alarm', label: 'Daily Alarm', inputType: 'time' },
    {
      name: 'groupedField1',
      label: 'Grouped Field 1',
      comparator: 'groupNumber',
      groupNumber: 'group1',
      valueSources: ['field', 'value'],
    },
    {
      name: 'groupedField2',
      label: 'Grouped Field 2',
      comparator: 'groupNumber',
      groupNumber: 'group1',
      valueSources: ['field', 'value'],
    },
    {
      name: 'groupedField3',
      label: 'Grouped Field 3',
      comparator: 'groupNumber',
      groupNumber: 'group1',
      valueSources: ['field', 'value'],
    },
    {
      name: 'groupedField4',
      label: 'Grouped Field 4',
      comparator: 'groupNumber',
      groupNumber: 'group1',
      valueSources: ['field', 'value'],
    },
  ]

const queryStore = writable(initialQuery);

// Function to handle query changes
function onQueryChange(newQuery) {
  queryStore.set(newQuery);
  // console.log(newQuery);
  console.log(formatQuery(newQuery), "JSONata");

  let queriedData = []
  $state.rows.forEach((row) => {
    if (newQuery.rules.length === 0) {
      queriedData.push(row)
    } else {
      let rowMatch = true
      newQuery.rules.forEach((rule) => {
        console.log("check diff", $state.columnDefs, rule.field)
        const cellId = $state.columnDefs.find((col) => col.id === rule.field).id
        console.log("cellId", cellId)
        const value = row.cells[cellId]?.value
        if (rule.operator === '=') {
          console.log("rule", rule.operator, rule.field, rule.value)
          console.log(row[rule.field], rule.value)
          if (value !== rule.value) {
            rowMatch = false
          }
        }
      })
      if (rowMatch) {
        queriedData.push(row)
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