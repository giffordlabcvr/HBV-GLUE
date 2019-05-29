glue.command(["multi-delete", "feature_location", "-w", "referenceSequence.name != 'REF_MASTER_NC_003977'"]);

var refSeqObjs = glue.tableToObjects(glue.command(["list", "reference", "-w", "name != 'REF_MASTER_NC_003977'", "name", "sequence.gb_length"]));

// pre-Core is allowed to be non-functional. This happens sometimes and is well documented.

var codingFeaturesToCheck = ["X", "S", "PRE_S2", "PRE_S1", /*"PRE_C",*/ "P", "C"];

var problematicRefs = {};

_.each(refSeqObjs, function(refSeqObj) {
	glue.inMode("reference/"+refSeqObj.name, function() {
		glue.command(["add", "feature-location", "whole_genome"]);
		glue.inMode("feature-location/whole_genome", function() {
			glue.command(["add", "segment", 1, refSeqObj["sequence.gb_length"]]);
		});
		glue.command(["inherit", "feature-location", 
			"--recursive", "--spanGaps", 
			"AL_UNCONSTRAINED", "--relRefName", "REF_MASTER_NC_003977", "whole_genome"]);
		_.each(codingFeaturesToCheck, function(featureName) {
			glue.inMode("feature-location/"+featureName, function() {
				var aaRows = glue.tableToObjects(glue.command(["amino-acid"]));
				for(var i = 0; i < aaRows.length; i++) {
					var aa = aaRows[i].aminoAcid;
					if(i == 0 && aa != "M") {
						glue.log("WARNING", "Residue "+aaRows[i].codonLabel+" of feature "+featureName+" on reference "+refSeqObj.name+" should be M");
						problematicRefs[refSeqObj.name] = "yes";
					}
					if(i < aaRows.length-1 && aa == "*") {
						if( !(featureName == "PRE_C" && aaRows[i].codonLabel == "28") ) { // precore mutants are ok
							glue.log("WARNING", "Residue "+aaRows[i].codonLabel+" of feature "+featureName+" on reference "+refSeqObj.name+" should not be *");
							problematicRefs[refSeqObj.name] = "yes";
						}
					}
					/*if(i < aaRows.length-1 && aa == "X") {
						glue.log("WARNING", "Residue "+aaRows[i].codonLabel+" of feature "+featureName+" on reference "+refSeqObj.name+" should not be X");
						problematicRefs[refSeqObj.name] = "yes";
					}*/
					if(i == aaRows.length-1 && aa != "*") {
						glue.log("WARNING", "Residue "+aaRows[i].codonLabel+" of feature "+featureName+" on reference "+refSeqObj.name+" should be *");
						problematicRefs[refSeqObj.name] = "yes";
					}
				}
				
			});
			
		});
	});
});

glue.logInfo("Problematic reference sequences: ", _.keys(problematicRefs));