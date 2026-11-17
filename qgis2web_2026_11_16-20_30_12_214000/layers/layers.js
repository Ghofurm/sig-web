var wms_layers = [];
var baseLayer = new ol.layer.Group({
    'title': '',
    layers: [
new ol.layer.Tile({
    'title': 'OSM DE',
    'type': 'base',
    source: new ol.source.XYZ({
        url: 'http://tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png',
        attributions: [new ol.Attribution({html: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors,<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'})]
    })
})
]
});
var format_KOTA_SEMARANG_0 = new ol.format.GeoJSON();
var features_KOTA_SEMARANG_0 = format_KOTA_SEMARANG_0.readFeatures(json_KOTA_SEMARANG_0, 
            {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
var jsonSource_KOTA_SEMARANG_0 = new ol.source.Vector({
    attributions: [new ol.Attribution({html: '<a href=""></a>'})],
});
jsonSource_KOTA_SEMARANG_0.addFeatures(features_KOTA_SEMARANG_0);var lyr_KOTA_SEMARANG_0 = new ol.layer.Vector({
                declutter: true,
                source:jsonSource_KOTA_SEMARANG_0, 
                style: style_KOTA_SEMARANG_0,
    title: 'KOTA_SEMARANG<br />\
    <img src="styles/legend/KOTA_SEMARANG_0_0.png" />  1640.0000 - 3690.8000 <br />\
    <img src="styles/legend/KOTA_SEMARANG_0_1.png" />  3690.8000 - 5741.6000 <br />\
    <img src="styles/legend/KOTA_SEMARANG_0_2.png" />  5741.6000 - 7792.4000 <br />\
    <img src="styles/legend/KOTA_SEMARANG_0_3.png" />  7792.4000 - 9843.2000 <br />\
    <img src="styles/legend/KOTA_SEMARANG_0_4.png" />  9843.2000 - 11894.0000 <br />'
        });var format_cakupan_1000m_1 = new ol.format.GeoJSON();
var features_cakupan_1000m_1 = format_cakupan_1000m_1.readFeatures(json_cakupan_1000m_1, 
            {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
var jsonSource_cakupan_1000m_1 = new ol.source.Vector({
    attributions: [new ol.Attribution({html: '<a href=""></a>'})],
});
jsonSource_cakupan_1000m_1.addFeatures(features_cakupan_1000m_1);var lyr_cakupan_1000m_1 = new ol.layer.Vector({
                declutter: true,
                source:jsonSource_cakupan_1000m_1, 
                style: style_cakupan_1000m_1,
                title: '<img src="styles/legend/cakupan_1000m_1.png" /> cakupan_1000m'
            });var format_faskes_semarang_2 = new ol.format.GeoJSON();
var features_faskes_semarang_2 = format_faskes_semarang_2.readFeatures(json_faskes_semarang_2, 
            {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
var jsonSource_faskes_semarang_2 = new ol.source.Vector({
    attributions: [new ol.Attribution({html: '<a href=""></a>'})],
});
jsonSource_faskes_semarang_2.addFeatures(features_faskes_semarang_2);var lyr_faskes_semarang_2 = new ol.layer.Vector({
                declutter: true,
                source:jsonSource_faskes_semarang_2, 
                style: style_faskes_semarang_2,
                title: '<img src="styles/legend/faskes_semarang_2.png" /> faskes_semarang'
            });

lyr_KOTA_SEMARANG_0.setVisible(true);lyr_cakupan_1000m_1.setVisible(true);lyr_faskes_semarang_2.setVisible(true);
var layersList = [baseLayer,lyr_KOTA_SEMARANG_0,lyr_cakupan_1000m_1,lyr_faskes_semarang_2];
lyr_KOTA_SEMARANG_0.set('fieldAliases', {'WADMKC': 'WADMKC', 'WADMKK': 'WADMKK', 'WADMPR': 'WADMPR', 'luas_km2': 'luas_km2', 'penduduk': 'penduduk', 'kepadatan': 'kepadatan', });
lyr_cakupan_1000m_1.set('fieldAliases', {'osm_id': 'osm_id', 'amenity': 'amenity', 'operator_t': 'operator_t', 'healthcare': 'healthcare', 'name': 'name', 'addr_full': 'addr_full', 'healthca_1': 'healthca_1', 'capacity_p': 'capacity_p', });
lyr_faskes_semarang_2.set('fieldAliases', {'osm_id': 'osm_id', 'amenity': 'amenity', 'operator_t': 'operator_t', 'healthcare': 'healthcare', 'name': 'name', 'addr_full': 'addr_full', 'healthca_1': 'healthca_1', 'capacity_p': 'capacity_p', });
lyr_KOTA_SEMARANG_0.set('fieldImages', {});
lyr_cakupan_1000m_1.set('fieldImages', {});
lyr_faskes_semarang_2.set('fieldImages', {'amenity': 'TextEdit', 'operator_t': 'TextEdit', 'healthcare': 'TextEdit', 'name': 'TextEdit', 'addr_full': 'TextEdit', 'healthca_1': 'TextEdit', 'capacity_p': 'TextEdit', });
lyr_KOTA_SEMARANG_0.set('fieldLabels', {'WADMKC': 'header label', 'WADMKK': 'no label', 'WADMPR': 'no label', 'luas_km2': 'no label', 'penduduk': 'inline label', 'kepadatan': 'inline label', });
lyr_cakupan_1000m_1.set('fieldLabels', {'amenity': 'no label', 'operator_t': 'no label', 'healthcare': 'no label', 'name': 'no label', 'addr_full': 'no label', 'healthca_1': 'no label', 'capacity_p': 'no label', });
lyr_faskes_semarang_2.set('fieldLabels', {'amenity': 'inline label', 'operator_t': 'inline label', 'healthcare': 'inline label', 'name': 'header label', 'addr_full': 'inline label', 'healthca_1': 'inline label', 'capacity_p': 'inline label', });
lyr_faskes_semarang_2.on('precompose', function(evt) {
    evt.context.globalCompositeOperation = 'normal';
});