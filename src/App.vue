<script setup>
import { reactive, ref, onMounted } from 'vue'

let incidentsInfo = ref('')
let coordChecked = ref(false);
let limit = ref(1000);
let crime_url = ref('');
let dialog_err = ref(false);
let map = reactive(
    {
        leaflet: null,
        center: {
            lat: 44.955139,
            lng: -93.102222,
            address: ''
        },
        zoom: 12,
        bounds: {
            nw: {lat: 45.008206, lng: -93.217977},
            se: {lat: 44.883658, lng: -92.993787}
        },
        neighborhood_markers: [
            {location: [44.942068, -93.020521], marker: null},
            {location: [44.977413, -93.025156], marker: null},
            {location: [44.931244, -93.079578], marker: null},
            {location: [44.956192, -93.060189], marker: null},
            {location: [44.978883, -93.068163], marker: null},
            {location: [44.975766, -93.113887], marker: null},
            {location: [44.959639, -93.121271], marker: null},
            {location: [44.947700, -93.128505], marker: null},
            {location: [44.930276, -93.119911], marker: null},
            {location: [44.982752, -93.147910], marker: null},
            {location: [44.963631, -93.167548], marker: null},
            {location: [44.973971, -93.197965], marker: null},
            {location: [44.949043, -93.178261], marker: null},
            {location: [44.934848, -93.176736], marker: null},
            {location: [44.913106, -93.170779], marker: null},
            {location: [44.937705, -93.136997], marker: null},
            {location: [44.949203, -93.093739], marker: null}
        ]
    }
);

// Vue callback for once <template> HTML has been added to web page
onMounted(() => {
    // Create Leaflet map (set bounds and valied zoom levels)
    map.leaflet = L.map('leafletmap').setView([map.center.lat, map.center.lng], map.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        minZoom: 11,
        maxZoom: 18
    }).addTo(map.leaflet);
    map.leaflet.setMaxBounds([[44.883658, -93.217977], [45.008206, -92.993787]]);

    // Drag function
    map.leaflet.on('dragend', () => {
        let center = map.leaflet.getCenter()

        document.getElementById('latitude').value = center.lat;
        document.getElementById('longitude').value = center.lng;

        let url = 'https://nominatim.openstreetmap.org/reverse?lat=' + center.lat + '&lon=' + center.lng + '&format=json&limit=1'

        document.getElementById('latitude').value = center.lat;
        document.getElementById('longitude').value = center.lng;

        fetch(url).then((response) => {
            return response.json();
        }).then((data) => {
            if (data.address.hasOwnProperty('house_number')) {
                document.getElementById('address').value = data.address.house_number + ' ' + data.address.road;
            } else {
                document.getElementById('address').value = data.address.road;
            }
        })

        refreshCrimes(limit.value);
    });

    // Zoom function
    map.leaflet.on('zoomend', () => {
        let center = map.leaflet.getCenter()

        let url = 'https://nominatim.openstreetmap.org/reverse?lat=' + center.lat + '&lon=' + center.lng + '&format=json&limit=1'

        document.getElementById('latitude').value = center.lat;
        document.getElementById('longitude').value = center.lng;

        fetch(url).then((response) => {
            return response.json();
        }).then((data) => {
            if (data.address.hasOwnProperty('house_number')) {
                document.getElementById('address').value = data.address.house_number + ' ' + data.address.road;
            } else {
                document.getElementById('address').value = data.address.road;
            }
        })

        refreshCrimes(limit.value);
    });

    // Get boundaries for St. Paul neighborhoods
    let district_boundary = new L.geoJson();
    district_boundary.addTo(map.leaflet);
    fetch('data/StPaulDistrictCouncil.geojson')
    .then((response) => {
        return response.json();
    })
    .then((result) => {
        result.features.forEach((value) => {
            district_boundary.addData(value);
        });
    })
    .catch((error) => {
        console.log('Error:', error);
    });
});


// FUNCTIONS
// Function called once user has entered REST API URL
function initializeCrimes() {
    // TODO: get code and neighborhood data
    //       get initial 1000 crimes
    fetch(crime_url.value + '/incidents?limit=1000').then((response) => {
        return response.json();
    }).then((result) => {
        updateTable(result);
    }).catch((error) => {
        console.log(error.message);
    });
}

// Function to retrieve crimes that are within map view
function refreshCrimes(limit) {
    let bounds = map.leaflet.getBounds();
    let nw_corner = bounds.getNorthWest();
    let se_corner = bounds.getSouthEast();

    let max_lat = nw_corner.lat;
    let min_lat = se_corner.lat;
    let max_lng = se_corner.lng;
    let min_lng = nw_corner.lng;

    let url = crime_url.value + '/incidents?limit=' + limit + '&neighborhood=';
    let neigh_number = 0;
    let first_neigh = true;

    for (let neigh_marker of map.neighborhood_markers) {
        let latitude = neigh_marker.location[0];
        let longitude = neigh_marker.location[1];

        if (isBetween(latitude, min_lat, max_lat) && isBetween(longitude, min_lng, max_lng)) {
            if (!first_neigh) {
                url += ',' + neigh_number;
            } else {
                url += neigh_number;
                first_neigh = false;
            }
        }
        neigh_number += 1;
    }

    fetch(url).then((response) => {
        return response.json();
    }).then((result) => {
        updateTable(result);
    }).catch((error) => {
        console.log(error.message);
    });
}

// Function to return if value is between min and max values
function isBetween(value, min, max) {
    return value >= min && value <= max;
}

// Function to update the table with the new values
function updateTable(data) {
    incidentsInfo.value = '';

    for (let incident of data) {
        // Replace incidentsInfo with new incidents
        incidentsInfo.value += '<tr>'
        incidentsInfo.value += '<td>' + incident.date + '</td>';
        incidentsInfo.value += '<td>' + incident.time + '</td>';
        incidentsInfo.value += '<td>' + incident.case_number + '</td>';
        incidentsInfo.value += '<td>' + incident.neighborhood_number + '</td>';
        incidentsInfo.value += '<td>' + incident.incident + '</td>';
        incidentsInfo.value += '</tr>';
    }
}

// Function called when user presses 'OK' on dialog box
function closeDialog() {
    let dialog = document.getElementById('rest-dialog');
    let url_input = document.getElementById('dialog-url');
    if (crime_url.value !== '' && url_input.checkValidity()) {
        dialog_err.value = false;
        dialog.close();
        initializeCrimes();
    }
    else {
        dialog_err.value = true;
    }
}

// Function called when user presses 'Go' button
function goCoord() {
    let longitude = 0;
    let latitude = 0;

    let longitude_el = document.getElementById('longitude');
    let latitude_el = document.getElementById('latitude');
    let address_el = document.getElementById('address');

    // If coordChecked is true, grab the coordinates
    // Else, grab the address
    if (coordChecked.value) {
        latitude = latitude_el.value;
        longitude = longitude_el.value;

        let url = 'https://nominatim.openstreetmap.org/reverse?lat=' + latitude + '&lon=' + longitude + '&format=json&limit=1'

        fetch(url).then( (response) => {
            return response.json();
        }).then( (data) => {
            address_el.value = data.address.road;

            clampView(latitude, longitude);
        }).catch( (error) => {
            console.error(error);
        });
    } else {
        let url = 'https://nominatim.openstreetmap.org/search?q=' + address_el.value + '' + '&format=json&limit=1';
        
        fetch(url).then( (response) => {
            return response.json();
        }).then( (data) => {
            longitude = data[0].lon;
            latitude = data[0].lat;

            longitude_el.value = longitude;
            latitude_el.value = latitude;

            clampView(latitude, longitude);
        }).catch( (error) => {
            console.error(error);
        });
    }
}

function clampView(latitude, longitude) {
    // Clamp the latitude and longitude
    if (latitude > 45.008206) {
        latitude = 45.008206;
    } else if (latitude < 44.883658) {
        latitude = 44.883658;
    }

    if ( longitude < -93.217977 ) {
        longitude = -93.217977;
    } else if ( longitude > -92.993787 ) {
        longitude = -92.993787;
    }

    map.leaflet.setView([latitude, longitude], map.leaflet.getZoom());
}
</script>

<template>
    <dialog id="rest-dialog" open>
        <h1 class="dialog-header">St. Paul Crime REST API</h1>
        <label class="dialog-label">URL: </label>
        <input id="dialog-url" class="dialog-input" type="url" v-model="crime_url" placeholder="http://localhost:8000" />
        <p class="dialog-error" v-if="dialog_err">Error: must enter valid URL</p>
        <br/>
        <button class="button" type="button" @click="closeDialog">OK</button>
    </dialog>
    <div class="grid-container ">
        <div class="grid-x grid-padding-x align-justify coord-bar">
            <div class="grid-x">
                <div id="lat-input" class="grid-x" v-show="coordChecked">
                    <p class="space-left">Latitude:</p>
                    <input id="latitude" class="coord-input space-left" type="text"/>
                </div>
                <div id="long-input" class="grid-x" v-show="coordChecked">
                    <p class="space-left">Longitude: </p>
                    <input id="longitude" class="coord-input space-left" type="text"/>
                </div>
                <div id="add-input" class="grid-x" v-show="!coordChecked">
                    <p class="space-left">Address: </p>
                    <input id="address" class="coord-input space-left" type="text"/>
                </div>
            </div>
            <div class="grid-x">
                <p>Lat/Long:</p>
                <label class="switch space-left">
                    <input type="checkbox" id="coord-check" v-model="coordChecked"/>
                    <span class="slider"></span>
                </label>
            </div>
            <button class="button coord-button" type="button" @click="goCoord">Go</button>
        </div>
        <div class="grid-x grid-padding-x">
            <div id="leafletmap" class="cell auto"></div>
        </div>
        <table id="crime-list">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Case Number</th>
                    <th>Neighborhood Name</th>
                    <th>Incident Type</th>
                </tr>
            </thead>
            <tbody v-html="incidentsInfo"></tbody>
        </table>
    </div>
</template>

<style>
#rest-dialog {
    width: 20rem;
    margin-top: 10rem;
    z-index: 1000;
}

#leafletmap {
    height: 500px;
}

.dialog-header {
    font-size: 1.2rem;
    font-weight: bold;
}

.dialog-label {
    font-size: 1rem;
}

.dialog-input {
    font-size: 1rem;
    width: 100%;
}

.dialog-error {
    font-size: 1rem;
    color: #D32323;
}

.coord-input {
    width: 20rem;
}

.coord-button {
    width: 7.5rem;
}

.coord-bar {
    margin-top: 1rem;
}

.coord-bar p {
    padding-top: 8px;
}

.space-left {
    margin-left: 1rem;
}

.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
}

input:checked + .slider {
  background-color: #1779ba;
}

input:focus + .slider {
  box-shadow: 0 0 1px #1779ba;
}

input:checked + .slider:before {
  -webkit-transform: translateX(26px);
  -ms-transform: translateX(26px);
  transform: translateX(26px);
}

#add-input {
    margin-right: 26.5rem;
}

#crime-list {
    margin-top: 1rem;
}
</style>
