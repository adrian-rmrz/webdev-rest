<script setup>
import { reactive, ref, onMounted } from 'vue'

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
    fetch(crime_url.value + '/codes?').then((res) => {
            return res.json()
        }).then((code) => {
            crime_code = code;
        }).catch((error) => {
            console.log(error.message);
        });

    fetch(crime_url.value + '/neighborhoods?').then((res) => {
            return res.json()
        }).then((hood) => {
            crime_neighborhood = hood;
        }).catch((error) => {
            console.log(error.message);
        });

    //       get initial 1000 crimes
    fetch(crime_url.value + '/incidents?limit=1000').then((response) => {
        return response.json();
    }).then((data) => {
        
        //loop to replace code with type
        for (let i = 0; i < data.length; i++) {
            for (let j = 0; j < crime_code.length; j++) {
                if (data[i].code == crime_code[j].code)
                {
                    data[i].code = crime_code[j].type;
                }
            delete data[i].incident; //remove redundant incident column
        }}

        //loop to replace number with name
        for (let i = 0; i < data.length; i++) {
            for (let j = 0; j < crime_neighborhood.length; j++) {
                if (data[i].neighborhood_number == crime_neighborhood[j].id)
                {
                    data[i].neighborhood_number = crime_neighborhood[j].name;
                }
        }};
        
        // function task(j) { 
        //     setTimeout(function() { 
        //         let loc = crime_neighborhood[j].name + ', st. paul, minnesota';
        //         let req = fetch('https://nominatim.openstreetmap.org/search?q='+ loc +'&format=json&limit=1');
        //         Promise.all([req])
        //         .then((response) => {
        //         return Promise.all([response[0].json()]);
        //         }).then((data) => {
        //         console.log(data);
        //         let lat = parseFloat(data[0][0].lat);
        //         let lon = parseFloat(data[0][0].lon);
        //         L.marker([lat, lon]).addTo(map);
        //         }).catch((error) => { 
        //         console.log(error.message)}
        //     )}, 2000 * j);
        // } 
        // //add markers to neighborhoods
        // for (let j = 0; j < crime_neighborhood.length; j++) {
        //     task(j);
        //     };

        let jsonString = JSON.stringify(data);
        jsonString = jsonString.replaceAll("code", "incident_type");
        jsonString = jsonString.replaceAll("neighborhood_number", "neighborhood_name");
        data = JSON.parse(jsonString);

        table_headings = Object.keys(data[0]);
        crime_table = data;
        
        console.log(crime_table);
        refresh.value += 1;
    }).catch((error) => {
        console.log(error.message);
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
        <div class="grid-x grid-padding-x align-justify">
            <div class="grid-x">
                <p class="space-left">Longitude: </p>
                <input id="longitude" class="coord-input space-left" type="text" placeholder="http://localhost:8000"/>
                <p class="space-left">Latitude:</p>
                <input id="latitude" class="coord-input space-left" type="text" placeholder="http://localhost:8000"/>
            </div>
            <button class="button coord-button" type="button">Go</button>
        </div>
        <div class="grid-x grid-padding-x">
            <div id="leafletmap" class="cell auto"></div>
        </div>
        <table id="crime-list" :key="refresh">
            <tr> 
                <th v-for="head in table_headings"> {{ head }} </th>
            </tr>
            <tr v-for="incident in crime_table"> 
                <td> {{ incident.case_number }} </td>
                <td> {{ incident.date }} </td>
                <td> {{ incident.time }} </td>
                <td> {{ incident.incident_type }} </td>
                <td> {{ incident.police_grid }} </td>
                <td> {{ incident.neighborhood_name }} </td>
                <td> {{ incident.block }} </td>
            </tr>
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

.space-left {
    margin-left: 1rem;
}

table, th, td {
    margin-top: 1rem;
    border: 1.5px solid black;
    text-align: center;
}

</style>
