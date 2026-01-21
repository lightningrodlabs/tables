<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { v1 as uuidv1 } from "uuid";
  import { Board, ColumnType } from "./board";
  import { cloneDeep } from "lodash";
  import { scale } from 'svelte/transition';
    
  export let showEditHeader = false;
  export let activeBoard: Board
  export let editHeaderIndex = null;
  export let headerElement: HTMLElement | null = null;

  let columnName
  let columnType
  let viewType = "choice"
  let addTo = ""
  let dropdownElement: HTMLElement
  let position = { top: 0, left: 0 }

  onMount(() => {
    // If no headerElement, we're adding a new column at the end
    if (!headerElement) {
      columnName = "Field " + ($state.columnDefs.length + 1);
      columnType = ColumnType.String;
      viewType = "add";
      addTo = "right";
      // Position at the end of the table
      const addColumnElement = document.getElementById("add-column-button");
      if (addColumnElement) {
        const rect = addColumnElement.getBoundingClientRect();
        position = {
          top: 166,
          left: rect.left - 180
        };
      }
    } else {
      columnName = $state.columnDefs[editHeaderIndex].name;
      columnType = $state.columnDefs[editHeaderIndex].type;
      
      // Position the dropdown relative to the header element
      // Using getBoundingClientRect which gives viewport-relative coordinates
      const rect = headerElement.getBoundingClientRect();
      
      position = {
        top: rect.bottom,
        left: rect.left
      };
    }
  })
  
  $: state = activeBoard.readableState()

  // Close on click outside
  let clickTimer: number | undefined;
  
  function handleClickOutside(event: MouseEvent) {
    if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
      showEditHeader = false;
    }
  }

  $: if (showEditHeader) {
    // Delay adding the click listener to avoid immediate closure
    if (clickTimer) clearTimeout(clickTimer);
    clickTimer = window.setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);
  } else {
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = undefined;
    }
    document.removeEventListener('click', handleClickOutside);
  }
  
  onDestroy(() => {
    if (clickTimer) clearTimeout(clickTimer);
    document.removeEventListener('click', handleClickOutside);
  });
</script>

{#if activeBoard && showEditHeader}
{@const columnTypes = Object.values(ColumnType).filter((key) => isNaN(Number(key)))}

<div 
  class="dropdown-menu" 
  bind:this={dropdownElement}
  style="top: {position.top}px; left: {position.left}px;"
  transition:scale="{{ duration: 150, start: 0.95 }}"
  on:click={(e) => e.stopPropagation()}
>
    {#if viewType === "choice"}
      <button
        class="dropdown-item"
        on:click={()=>{
          viewType = "edit";
        }}
      >Edit Column</button>
      
      <button
        class="dropdown-item"
        on:click={()=>{
          addTo = "left";
          viewType = "add";
        }}
      >Insert Column Left</button>
      
      <button
        class="dropdown-item"
        on:click={()=>{
          addTo = "right";
          viewType = "add";
        }}
      >Insert Column Right</button>

      <button
        class="dropdown-item danger"
        on:click={()=>{
          const columnDefs = cloneDeep($state.columnDefs);
          columnDefs.splice(editHeaderIndex, 1);
          activeBoard.requestChanges([{ type: "set-column-defs",  "columnDefs": columnDefs}]);
          showEditHeader = false;
        }}
      >Delete Column</button>

    {:else if viewType === "edit"}
      <div class="dropdown-header">Edit Column</div>

      <div class="dropdown-form">
        <input
          type="text"
          class="dropdown-input"
          id="column-name"
          placeholder="Column name"
          bind:value={columnName}
        />
      </div>
      <div class="dropdown-form">
        <label for="column-type">Type:</label>
        <select
          class="dropdown-select"
          id="column-type"
          bind:value={columnType}
        >
          {#each columnTypes as type}
            {#if type !== "TableLink"}
              <option value={columnTypes.indexOf(type)}>{type}</option>
            {/if}
          {/each}
        </select>
      </div>

      <div class="dropdown-actions">
        <button
          class="dropdown-action-btn"
          on:click={()=>{
            viewType = "choice";
          }}
        >Back</button>
        <button
          class="dropdown-action-btn primary"
          on:click={()=>{
            const columnDefs = cloneDeep($state.columnDefs);
            columnDefs[editHeaderIndex].name = columnName;
            columnDefs[editHeaderIndex].type = columnType;
            activeBoard.requestChanges([{ type: "set-column-defs",  "columnDefs": columnDefs}]);
            showEditHeader = false;
          }}
        >Save</button>
      </div>

    {:else if viewType === "add"}
      <div class="dropdown-header">Add Column to {addTo}</div>
      <div class="dropdown-form">
        <input
          type="text"
          class="dropdown-input"
          id="column-name"
          placeholder="Column name"
          bind:value={columnName}
        />
      </div>
      <div class="dropdown-form">
        <label for="column-type">Type:</label>
        <select
          class="dropdown-select"
          id="column-type"
          bind:value={columnType}
        >
          {#each columnTypes as type}
            <option value={columnTypes.indexOf(type)}>{type}</option>
          {/each}
        </select>
      </div>
      <div class="dropdown-actions">
        <button
          class="dropdown-action-btn"
          on:click={()=>{
            if (headerElement === null) {
              showEditHeader = false;
            } else {
              viewType = "choice";
            }
          }}
        >{headerElement === null ? 'Cancel' : 'Back'}</button>
        <button
          class="dropdown-action-btn primary"
          on:click={()=>{
            const columnDefs = cloneDeep($state.columnDefs);
            if (addTo === "left") {
              columnDefs.splice(editHeaderIndex, 0, {name: columnName, type: columnType, id: uuidv1()});
            } else if (addTo === "right") {
              columnDefs.splice(editHeaderIndex + 1, 0, {name: columnName, type: columnType, id: uuidv1()});
            }
            activeBoard.requestChanges([{ type: "set-column-defs",  "columnDefs": columnDefs}]);
            showEditHeader = false;
          }}
        >Add</button>
      </div>
    {/if}
</div>
{/if}

<style>
.dropdown-menu {
  position: fixed;
  z-index: 1000;
  background: white;
  border: 1px solid #462700;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 160px;
  margin-left: 40px;
  padding: 0;
  max-height: 400px;
  overflow-y: auto;
}

.dropdown-header {
  padding: 8px 12px;
  font-weight: bold;
  font-size: 14px;
  color: #4a4a4a;
  border-bottom: 1px solid #e0e0e0;
  background: #f5f5f5;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 8px 16px;
  border: none;
  background: white;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: background-color 0.15s ease;
}

.dropdown-item:hover {
  background-color: #f0f0f0;
}

.dropdown-item.danger {
  color: #d32f2f;
}

.dropdown-item.danger:hover {
  background-color: #ffebee;
}

.dropdown-divider {
  height: 1px;
  background: #e0e0e0;
  margin: 4px 0;
}

.dropdown-form {
  padding: 8px 12px;
}

.dropdown-form label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #555;
}

.dropdown-input,
.dropdown-select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 0px;
  font-size: 14px;
  box-sizing: border-box;
}

.dropdown-input:focus,
.dropdown-select:focus {
  outline: none;
  border-color: #3c3c3c;
}

.dropdown-actions {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
}

.dropdown-action-btn {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid #ccc;
  border-radius: 0px;
  background: white;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s ease;
}

.dropdown-action-btn:hover {
  background: #f0f0f0;
}

.dropdown-action-btn.primary {
  background: #454545;
  color: white;
  border-color: #363636;
}

.dropdown-action-btn.primary:hover {
  background: #4b4b4b;
}
</style>
