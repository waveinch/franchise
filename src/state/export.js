import _ from 'lodash'
import React from 'react'
import * as State from '../state'
import * as U from '../state/update'
import swal from 'sweetalert2'

import { Tooltip, Position, Popover, Menu, MenuItem } from '@blueprintjs/core'
import { getDB } from '../db/configure'

export default function ExportButton() {
    return (
        <span>
            <div className="pt-button-group pt-large" style={{ float: 'right' }}>
                <button
                    type="button"
                    className="pt-button"
                    onClick={(e) => downloadNotebook(false)}
                >
                    <i className="fa fa-download" aria-hidden="true" /> Download
                </button>
            </div>
        </span>
    )
}

function dumpCell(cell) {
    let dump = {
        query: cell.query,
        id: cell.id,
        error: cell.error && cell.error + '',
        suggestedName: cell.suggestedName,
        loading: false,
        markdown: cell.markdown,
        selected: cell.selected,
    }
    if (cell.result) {
        dump.result = {
            nameable: cell.result.nameable,
            columns: cell.result.columns,
            values: (cell.result.values || []).slice(0, 200),
        }
    }
    return dump
}

async function dumpApplicationState(withCredentials, includeDump) {
    let data = State.get()
    let dump = {
        state: {
            ...data,
            connect: {
                active: data.connect.active,
                status: 'unconfigured',
            },
            config: withCredentials ? data.config : {},
            notebook: {
                ...data.notebook,
                layout: data.notebook.layout.map((k) => ({
                    ...k,
                    items: k.items.map(dumpCell),
                })),
            },
            trash: {
                ...data.trash,
                cells: data.trash.cells.map(dumpCell),
            },
        },
        autoconnect: withCredentials && data.connect.status === 'connected',
        version: 2,
    }

    if (withCredentials && includeDump && getDB().exportData) {
        let db_data = await getDB().exportData()
        dump.databaseDump = db_data
        console.log(db_data)
    }

    return dump
}

function isEmpty(state) {
    if (state.connect.status === 'connected') return false
    if (state.notebook.layout.length === 0) return true
    if (state.notebook.layout.some((k) => k.items.some((f) => (f.query || '').trim() != '')))
        return false
    return true
}

let lastStateDump
async function updateAutosave() {
    let nextState = State.get()
    if (lastStateDump === nextState) return
    lastStateDump = nextState

    if (isEmpty(nextState)) {
        delete localStorage.autosave
        delete sessionStorage.autosave
    } else {
        let dumpStr = JSON.stringify(await dumpApplicationState(true, true))
        localStorage.autosave = dumpStr
        sessionStorage.autosave = dumpStr
    }
    localStorage.credentials = JSON.stringify(State.get('config', 'credentials'))
    localStorage.activeConnector = State.get('connect', 'active')
}

async function makeURL(title) {
    let data = await dumpApplicationState(false, true)

    var bin_data = JSON.stringify(JSON.stringify(data))
    var basename = location.protocol + '//' + location.host + location.pathname
    return URL.createObjectURL(
        new Blob([
            require('raw-loader!./export_template.html')
                .replace('{{notebook_name}}', title)
                .replace('{{bin_data}}', bin_data)
                .replace('{{base_url}}', basename)
                .replace(
                    '{{notebook_contents}}',
                    State.getAll('notebook', 'layout', U.each, 'items', U.each, 'query')
                        .join('\n\n========================================================n\n')
                        .replace(/<\/script/g, 'script')
                ),
        ])
    )
}

async function downloadNotebook() {
    let extension = 'html'
    let default_name = new Date().toISOString().slice(0, 10)

    const a = document.createElement('a')
    a.style.position = 'absolute'
    a.style.top = '-10000px'
    a.style.left = '-10000px'

    document.body.appendChild(a)

    const prompt = await swal.fire({
        input: 'text',
        showCancelButton: true,
        title: 'Export Notebook',
        inputPlaceholder: default_name,
    })
    if (!prompt.dismiss) {
        let title = prompt.value || default_name
        a.setAttribute('download', title.match(/.+\..+/) ? title : title + '.' + extension)
        a.setAttribute('href', await makeURL(title))
        a.click()

        requestAnimationFrame((e) => a.remove())
    }
}

const AUTOSAVE_INTERVAL = 2718
let autosaveInterval = setInterval(updateAutosave, AUTOSAVE_INTERVAL)
if (module.hot) {
    module.hot.dispose(function() {
        clearInterval(autosaveInterval)
    })
}
