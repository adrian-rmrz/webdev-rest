<script setup>
import { reactive, ref, onMounted } from 'vue'

let crime_markers = ref([]);
let redCrime = ref(['Homicide', 'Robbery', 'Rape', 'Simple Asasult Dom.', 'Agg. Assault Dom.','Agg. Assault']);
let orangeCrime = ref(['Burglary', 'Theft', 'Auto Theft', 'Arson']);
let yellowCrime = ref(['Narcotics', 'Discharge', 'Vandalism', 'Graffiti']);
let neighborhood_name = ref([]);
let coordChecked = ref(false);
let limit = ref(1000);
let crime_url = ref('');
let crime_table = ref([]);
let crime_code = ref([]);
let table_headings = ref([]);
let crime_neighborhood = ref([]);
let refresh = ref(0);
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
            {location: [44.942068, -93.020521], marker: null, popupContent: 0},
            {location: [44.977413, -93.025156], marker: null, popupContent: 0},
            {location: [44.931244, -93.079578], marker: null, popupContent: 0},
            {location: [44.956192, -93.060189], marker: null, popupContent: 0},
            {location: [44.978883, -93.068163], marker: null, popupContent: 0},
            {location: [44.975766, -93.113887], marker: null, popupContent: 0},
            {location: [44.959639, -93.121271], marker: null, popupContent: 0},
            {location: [44.947700, -93.128505], marker: null, popupContent: 0},
            {location: [44.930276, -93.119911], marker: null, popupContent: 0},
            {location: [44.982752, -93.147910], marker: null, popupContent: 0},
            {location: [44.963631, -93.167548], marker: null, popupContent: 0},
            {location: [44.973971, -93.197965], marker: null, popupContent: 0},
            {location: [44.949043, -93.178261], marker: null, popupContent: 0},
            {location: [44.934848, -93.176736], marker: null, popupContent: 0},
            {location: [44.913106, -93.170779], marker: null, popupContent: 0},
            {location: [44.937705, -93.136997], marker: null, popupContent: 0},
            {location: [44.949203, -93.093739], marker: null, popupContent: 0}
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
    let fetch_neigh = crime_url.value + '/neighborhoods';
    let fetch_inc = crime_url.value + '/incidents?limit=1000';

    Promise.all([fetch(fetch_neigh), fetch(fetch_inc)])
    .then((response) => {
        return Promise.all([response[0].json(), response[1].json()]);
    }).then((result) => {
        neighborhood_name.value = result[0];

        for (let i = 0; i < map.neighborhood_markers.length; i++) {
            let neigh_marker = map.neighborhood_markers[i];
            let latitude = neigh_marker.location[0];
            let longitude = neigh_marker.location[1];

            let mark = L.marker([latitude, longitude]);
            mark.addTo(map.leaflet);
            map.neighborhood_markers[i].marker = mark;
            map.neighborhood_markers[i].popupContent = 0;
        }
        
        crime_table.value = result[1];
        updateMarkerPopup(result[1]);
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

    let url = crime_url.value + '/incidents?limit=' + limit;
    let neigh_array = [];
    let neigh_number = 0;

    for (let neigh_marker of map.neighborhood_markers) {
        let latitude = neigh_marker.location[0];
        let longitude = neigh_marker.location[1];

        if (isBetween(latitude, min_lat, max_lat) && isBetween(longitude, min_lng, max_lng)) {
            neigh_array.push(neigh_number);
        }

        neigh_number += 1;
    }

    if (neigh_array.length > 0) {
        url += '&neighborhood=' + checkNeighborhood(neigh_array);
    }

    url += checkUIControls();

    fetch(url).then((response) => {
        return response.json();
    }).then((result) => {
        crime_table.value = result;
        
        updateMarkerPopup(result);
    }).catch((error) => {
        console.log(error.message);
    });
}

function addCrimeMarker(incident) {
    let address = incident.block;
    
    if (!incident.block.includes(" AND ")) {
        let address_parts = incident.block.split(' ');
        let number = address_parts[0];
        let number_parts = number.split('');

        for (let i = 0; i < number_parts.length; i++) {
            if (number_parts[i] == "X") {
                number_parts[i] = "0";
            }
        }

        number = number_parts.join('');
        address_parts[0] = number;
        address = address_parts.join(' ');
    } else {
        let address_parts = incident.block.split(' ');
        let address_arr = [];

        for (let i = 0; i < address_parts.length; i++) {
            if (address_parts[i] == "AND") {
                break;
            } else {
                address_arr.push(address_parts[i]);
            }
        }

        address = address_arr.join(' ');
    }

    console.log(address);
    let url = 'https://nominatim.openstreetmap.org/search?q=' + address + ' St Paul Minnesota' + '&format=json&limit=1';
        
    fetch(url).then((response) => {
        return response.json();
    }).then((data) => {
        longitude = data[0].lon;
        latitude = data[0].lat;

        let redMarker = L.divIcon({className: 'redIcon', iconSize: [28, 28]});
        let mark = L.marker([latitude, longitude], { icon: redMarker });
        crime_markers.value.push(mark);

        console.log(crime_markers.value);
        let popup = L.popup().setContent('<p>Date: ' + incident.date + '<br/>Time: ' + incident.time + '<br/>Incident: ' + incident.incident + '</p><button class="button delete-button" type="button" onClick="deletePopup('+ (crime_markers.value.length - 1) + ')">Delete</button>');
        mark.bindPopup(popup);

        mark.addTo(map.leaflet);
    }).catch( (error) => {
        console.error(error);
    });

    // 
}

function deletePopup(marker_index) {
    console.log("Marker Index: " + marker_index);
}

// Update marker popups with new crimes information
function updateMarkerPopup(data) {
    map.neighborhood_markers.forEach((mark) => {
        mark.popupContent = 0;
    });

    data.forEach((crime) => {
        map.neighborhood_markers[crime.neighborhood_number-1].popupContent += 1;
    });

    map.neighborhood_markers.forEach((mark) => {
        mark.marker.bindPopup(mark.popupContent.toString());
    });
}

// Function to return if value is between min and max values
function isBetween(value, min, max) {
    return value >= min && value <= max;
}

// Function to delete incident
function deleteIncident(case_number) {
    fetch(crime_url.value + '/remove-incident', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ case_number: case_number }),
    })
    .then((response) => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.text();
    })
    .then(() => {
        refreshCrimes(limit.value);
        console.log("Incident " + case_number + " deleted.");
    })
    .catch((error) => {
        console.error('Error:', error);
    });
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
        let url = 'https://nominatim.openstreetmap.org/search?q=' + address_el.value + ' St Paul Minnesota' + '&format=json&limit=1';
        
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

// Returns the neighborhoods on the map
function checkNeighborhood(data) {
    let retString = "";

    // If there are neighbors within the map, add them to the url
    if (data.length > 0) {
        for (let neigh of data) {
            let name = neighborhood_name.value[neigh].name;

            if (document.getElementById(name).checked) {
                retString += (document.getElementById(name).value + ",");
            }
        }
    }

    return retString;
}

// Checks which boxes were checked on controls
function checkUIControls() {
    let url = "";
    
    if (document.getElementById('Burglary').checked){
        url += ("&incident=" + document.getElementById('Burglary').value + ",");
    }
    if (document.getElementById('Rape').checked){
        if (url == "") {
            url += "&incident=";
        }
        url += (document.getElementById('Rape').value + ",");
    }
    if (document.getElementById('Robbery').checked){
        if (url == "") {
            url += "&incident=";
        }
        url += (document.getElementById('Robbery').value + ",");
    }
    if (document.getElementById('Theft').checked){
        if (url == "") {
            url += "&incident=";
        }
        url += (document.getElementById('Theft').value + ",");
    }
    if (document.getElementById('Auto Theft').checked){
        if (url == "") {
            url += "&incident=";
        }
        url += (document.getElementById('Auto Theft').value + ",");
    }
    if (document.getElementById('Narcotics').checked){
        if (url == "") {
            url += "&incident=";
        }
        url += (document.getElementById('Narcotics').value + ",");
    }
    if (document.getElementById('Discharge').checked){
        if (url == "") {
            url += "&incident=";
        }
        url += (document.getElementById('Discharge').value + ",");
    }
    if (document.getElementById('Vandalism').checked){
        if (url == "") {
            url += "&incident=";
        }
        url += (document.getElementById('Vandalism').value + ",");
    }
    if (document.getElementById('Assault').checked){
        if (url == "") {
            url += "&incident=";
        }
        url += (document.getElementById('Assault').value + ",");
    }
    if (document.getElementById('Arson').checked){
        if (url == "") {
            url += "&incident=";
        }
        url += (document.getElementById('Arson').value + ",");
    }
    if (document.getElementById('Homicide').checked){
        if (url == "") {
            url += "&incident=";
        }
        url += (document.getElementById('Homicide').value + ",");
    }

    url += ("&start_date=" + document.getElementById('start_date').value);
    url += ("&end_date=" + document.getElementById('end_date').value);

    return url;
}
//Refresh table when user changed the filter
function tableRefresh() {
    limit.value = document.getElementById('max_incidents').value;
    refreshCrimes(limit.value);
}

//Create and insert new incident
function openForm() {
    if (crime_url.value !== "") {
        let dialog = document.getElementById('form-dialog');
        dialog.showModal();
    }
}

function closeForm() {
    let dialog = document.getElementById('form-dialog');
    dialog.close();
}

let formCaseNum = ref("");
let formDateTime = ref("");
let formCode = ref("");
let formIncident = ref("");
let formPoGrid = ref("");
let formNeiNum = ref("");
let formBlock = ref("");

function createIncident() {
    //PUT request:
    let dialog = document.getElementById('form-dialog');
    let putURL = crime_url + "/new-incident";
    
    let newData = {
        case_number: formCaseNum,
        data_time: formDateTime,
        code: formCode,
        incident: formIncident,
        police_grid: formPoGrid,
        neighborhood_number: formNeiNum,
        block: formBlock,
    };
    console.log(newData);

    fetch(putURL, 
        {method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newData)
    }).then(response => {
        console.log(response.status);
        return response.json();
    }).then(data => {
        console.log('PUT request successful:', data);
    }).catch(error => {
        console.error('Error:', error);
    });

    dialog.close();
}

</script>

<template>
    
    <div class="grid-x grid-padding-x">
            <button type="button" class="cell large-auto button" @click="openForm" style="background-color: green;">New Incident Form</button>
            <button type="button" class="cell large-auto button" @click="" style="background-color: rebeccapurple;">About</button>
    </div>
    <dialog id="form-dialog">
        <h1 class="dialog-header">Form</h1>
        <label class="dialog-label">case_number</label>
        <input id="formCaseNum" class="dialog-input" type="text" v-model="formCaseNum" placeholder="########" />
        <br/>
        <label class="dialog-label">Date_Time</label>
        <input id="formDate" class="dialog-input" type="text" v-model="formDateTime" placeholder="YY-MM-DDT00:00:00" />
        <br/>
        <label class="dialog-label">Code</label>
        <input id="formCode" class="dialog-input" type="text" v-model="formCode" placeholder="#"/>
        <br/>
        <label class="dialog-label">Incident</label>
        <input id="formIncident" class="dialog-input" type="text" v-model="formIncident" placeholder="" />
        <br/>
        <label class="dialog-label">police_grid</label>
        <input id="formPoGrid" class="dialog-input" type="text" v-model="formPoGrid" placeholder="" />
        <br/>
        <label class="dialog-label">neighborhood_number</label>
        <input id="formNeiNum" class="dialog-input" type="text" v-model="formNeiNum" placeholder="" />
        <br/>
        <label class="dialog-label">block</label>
        <input id="formBlock" class="dialog-input" type="text" v-model="formBlock" placeholder="" />
        <br/>
        <button class="button" id="create" type="button" @click="createIncident">Create</button>
        <button class="button" id="closebutton" type="button" @click="closeForm">Cancel</button>
    </dialog>
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
        <div class="grid-container">
            <div class="grid-x grid-padding-x">
                <div class="large-4">
                    <strong>Incident Type</strong><br>
                    <input checked="true" type="checkbox" id="Burglary" value="Burglary" @change="tableRefresh"/>
                        <label for="Burglary">Burglary</label> 
                    <input checked="true" type="checkbox" id="Rape" value="Rape" @change="tableRefresh"/>
                        <label for="Rape">Rape</label> 
                    <input checked="true" type="checkbox" id="Robbery" value="Robbery" @change="tableRefresh"/>
                        <label for="Robbery">Robbery</label>
                    <input checked="true" type="checkbox" id="Theft" value="Theft" @change="tableRefresh"/>
                        <label for="Theft">Theft</label> <br>
                    <input checked="true" type="checkbox" id="Auto Theft" value="Auto Theft" @change="tableRefresh"/>
                        <label for="Auto Theft">Auto Theft</label> 
                    <input checked="true" type="checkbox" id="Narcotics" value="Narcotics" @change="tableRefresh"/>
                        <label for="Narcotics">Narcotics</label>
                    <input checked="true" type="checkbox" id="Discharge" value="Discharge" @change="tableRefresh"/>
                        <label for="Discharge">Discharge</label> <br>
                    <input checked="true" type="checkbox" id="Vandalism" value="Vandalism,Graffiti" @change="tableRefresh"/>
                        <label for="Vandalism">Vandalism</label>
                    <input checked="true" type="checkbox" id="Assault" value="Simple Asasult Dom.,Agg. Assault Dom.,Agg. Assault" @change="tableRefresh"/>
                        <label for="Assault">Assault</label>
                    <input checked="true" type="checkbox" id="Arson" value="Arson" @change="tableRefresh"/>
                        <label for="Arson">Arson</label> <br>
                    <input checked="true" type="checkbox" id="Homicide" value="Homicide" @change="tableRefresh"/>
                        <label for="Homicide">Homicide</label>
                </div>
                <div class="large-4">
                    <strong>Neighborhood Name</strong><br>
                    <input checked="true" type="checkbox" id="Conway/Battlecreek/Highwood" value=1 @change="tableRefresh"/>
                        <label for="Conway/Battlecreek/Highwood">Conway/Battlecreek/Highwood</label> 
                    <input checked="true" type="checkbox" id="Greater East Side" value=2 @change="tableRefresh"/>
                        <label for="Greater East Side">Greater East Side</label> <br>
                    <input checked="true" type="checkbox" id="West Side" value=3 @change="tableRefresh"/>
                        <label for="West Side">West Side</label>
                    <input checked="true" type="checkbox" id="Dayton's Bluff" value=4 @change="tableRefresh"/>
                        <label for="Dayton's Bluff">Dayton's Bluff</label> 
                    <input checked="true" type="checkbox" id="Payne/Phalen" value=5 @change="tableRefresh"/>
                        <label for="Payne/Phalen">Payne/Phalen</label> <br> 
                    <input checked="true" type="checkbox" id="North End" value=6 @change="tableRefresh"/>
                        <label for="North End">North End</label>
                    <input checked="true" type="checkbox" id="Thomas/Dale(Frogtown)" value=7 @change="tableRefresh"/>
                        <label for="Thomas/Dale(Frogtown)">Thomas/Dale(Frogtown)</label> <br>
                    <input checked="true" type="checkbox" id="Summit/University" value=8 @change="tableRefresh"/>
                        <label for="Summit/University">Summit/University</label>
                    <input checked="true" type="checkbox" id="West Seventh" value=9 @change="tableRefresh"/>
                        <label for="West Seventh">West Seventh</label>
                    <input checked="true" type="checkbox" id="Como" value=10 @change="tableRefresh"/>
                        <label for="Como">Como</label> <br>
                    <input checked="true" type="checkbox" id="Hamline/Midway" value=11 @change="tableRefresh"/>
                        <label for="Hamline/Midway">Hamline/Midway</label>
                    <input checked="true" type="checkbox" id="St. Anthony" value=12 @change="tableRefresh"/>
                        <label for="St. Anthony">St. Anthony</label>
                    <input checked="true" type="checkbox" id="Union Park" value=13 @change="tableRefresh"/>
                        <label for="Union Park">Union Park</label> <br>
                    <input checked="true" type="checkbox" id="Macalester-Groveland" value=14 @change="tableRefresh"/>
                        <label for="Macalester-Groveland">Macalester-Groveland</label>
                    <input checked="true" type="checkbox" id="Highland" value=15 @change="tableRefresh"/>
                        <label for="Highland">Highland</label>
                    <input checked="true" type="checkbox" id="Summit Hill" value=16 @change="tableRefresh"/>
                        <label for="Summit Hill">Summit Hill</label> <br>
                    <input checked="true" type="checkbox" id="Capitol River" value=17 @change="tableRefresh"/>
                        <label for="Capitol River">Capitol River</label>
                </div>
                <div class="large-2">
                    <strong>Date Range</strong><br>
                    <p>Start Date:</p>
                    <select id="start_date" class="dropdown" @change="tableRefresh">
                        <option selected="selected" value="2014-01-01" > 2014-01-01</option>
                        <option value="2015-01-01" > 2015-01-01</option>
                        <option value="2016-01-01" > 2016-01-01</option>
                        <option value="2017-01-01" > 2017-01-01</option>
                        <option value="2018-01-01" > 2018-01-01</option>
                        <option value="2019-01-01" > 2019-01-01</option>
                        <option value="2020-01-01" > 2020-01-01</option>
                        <option value="2021-01-01" > 2021-01-01</option>
                        <option value="2022-01-01" > 2022-01-01</option>
                        <option value="2023-01-01" > 2023-01-01</option>
                    </select> 
                    <p>End Date:</p>
                    <select id="end_date" class="dropdown" @change="tableRefresh">
                        <option value="2015-01-01" > 2015-01-01</option>
                        <option value="2016-01-01" > 2016-01-01</option>
                        <option value="2017-01-01" > 2017-01-01</option>
                        <option value="2018-01-01" > 2018-01-01</option>
                        <option value="2019-01-01" > 2019-01-01</option>
                        <option value="2020-01-01" > 2020-01-01</option>
                        <option value="2021-01-01" > 2021-01-01</option>
                        <option value="2022-01-01" > 2022-01-01</option>
                        <option value="2023-01-01" > 2023-01-01</option>
                        <option selected="selected" value="2024-01-01" > 2024-01-01</option>
                    </select>       
                    
                </div>
                <div class="large-2">
                    <strong>Max Incidents</strong><br>
                    <select name="max_incidents" class="dropdown" id="max_incidents" @change="tableRefresh">
                        <option value="10">10</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="250">250</option>
                        <option value="500">500</option>
                        <option selected="selected" value="1000">1000</option>
                    </select>  
                </div>
            </div>
        </div>
        <table id="crime-list">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Case Number</th>
                    <th>Neighborhood Name</th>
                    <th>Incident Type</th>
                    <th>Delete Incident</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="incident in crime_table" @click="addCrimeMarker(incident)" style="background-color: {{colorTable}};"> 
                    <td> {{ incident.date }} </td>
                    <td> {{ incident.time }} </td>
                    <td> {{ incident.case_number }} </td>
                    <td> {{ neighborhood_name[ incident.neighborhood_number-1 ].name }} </td>
                    <td> {{ incident.incident }} </td>
                    <button class="button delete-button" type="button" @click="deleteIncident(incident.case_number)">Delete</button>
                </tr>
            </tbody>
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
    margin-bottom: 1rem;
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
#closebutton {
    float:right;
}

#crime-list {
    margin-bottom: 5%;
}

.dropdown {
    width: 8rem;
}

.delete-button {
    background-color: #D32323;
    width: 6rem;
    margin: auto;
}

.delete-button:hover {
    background-color: #ab2020;
}

thead th {
    text-align: center;
}

table, th, td {
    margin-top: 1rem;
    text-align: center;
}

.redIcon {
  position: absolute;
  top: 40%;
  left: 50%;
  margin-left: -115px;
  
  border-radius: 50% 50% 50% 0;
  border: 4px solid #ab2020;
  width: 2rem;
  height: 2rem;
  transform: rotate(-45deg);
}

.redIcon::after {
  position: absolute;
  content: '';
  width: 10px;
  height: 10px;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  margin-left: -5px;
  margin-top: -5px;
  background-color: #ab2020;
}

.colorRed { 
    background-color: #df4d04ee; 
}
.colorYellow { 
    background-color: #f7d633; 
}
.colorOrange { 
    background-color: #e79129; 
}

</style>
