var cladeStructureObj = {};

cladeStructureObj.referenceSourceName = "ncbi-refseqs";
cladeStructureObj.alignmentName = "AL_MASTER";
cladeStructureObj.almtDisplayName = "Hepatitis B Virus";
cladeStructureObj.cladeCategory = "species";
cladeStructureObj.constrainingRef = { "sequenceID": "NC_003977" };
cladeStructureObj.childAlignments = [];

var refListObjs;

glue.inMode("module/tabularUtilityTab", function() {
	refListObjs = glue.tableToObjects(glue.command(["load-tabular", "tabular/McNaughton_2019_refs.txt"]));
}); 

var gtNameToRefObjs = _.groupBy(refListObjs, function(rlo) {return rlo["Genotype"];} );

_.each(_.pairs(gtNameToRefObjs), function(pair) {
	var gtName = pair[0];
	var refObjs = pair[1];
	var gtObj = {};

	var gtRefId = _.find(refObjs, function (ro) {return ro["GtRef"] == "yes";})["Accession"];

	gtObj.constrainingRef = {sequenceID: gtRefId};

	gtObj.alignmentName = "AL_"+gtName;
	gtObj.almtDisplayName = "Genotype "+gtName;
	gtObj.cladeCategory = "genotype"; 

	gtObj.referenceSequences = [];
	
	// group the reference sequences within this genotype into subgenotypes
	var sgtNameToRefObjs = _.groupBy(refObjs, function(ro) {return ro["Subgenotype"];} );
	gtObj.childAlignments = []; 
		
	_.each(_.pairs(sgtNameToRefObjs), function(pair2) {
		var sgtName = pair2[0].trim();
		var sgtRefObjs = pair2[1];

		if(sgtName == "n/a") {
			_.each(sgtRefObjs, function(sgtRefObj) {
				var sequenceID = sgtRefObj["Accession"];
				gtObj.referenceSequences.push({ sequenceID: sequenceID} );
			});
		} else {
			var sgtObj = {};

			var sgtID = sgtName.replace(/ /g, "_").replace(/\(/g, "").replace(/\)/g, "");
			sgtObj.alignmentName = "AL_"+sgtID;
			sgtObj.almtDisplayName = "Subgenotype "+sgtName;
			sgtObj.cladeCategory = "subgenotype"

				_.each(sgtRefObjs, function(sgtRefObj) {
					var sequenceID = sgtRefObj["Accession"];
					sgtObj.constrainingRef = {sequenceID: sequenceID};
				});

			sgtObj.referenceSequences = _.map(sgtRefObjs, function(sgtro) {
				return { "sequenceID": sgtro["Accession"] };
			});
			gtObj.childAlignments.push(sgtObj);
		}
	});
	cladeStructureObj.childAlignments.push(gtObj);
	
});

glue.command(["file-util", "save-string", JSON.stringify(cladeStructureObj, null, 2), "json/clade_structure_and_refs.json"]);
