glue.command(["multi-delete", "feature_location", "-w", "referenceSequence.name != 'REF_NUMBERING_X02763'"]);

var refSeqObjs = glue.tableToObjects(glue.command(["list", "reference", "-w", "name != 'REF_NUMBERING_X02763'", "name", "sequence.gb_length"]));

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
			"AL_UNCONSTRAINED", "--relRefName", "REF_NUMBERING_X02763", "whole_genome"]);
		_.each(codingFeaturesToCheck, function(featureName) {
			glue.inMode("feature-location/"+featureName, function() {
				var aaRows = glue.tableToObjects(glue.command(["amino-acid"]));
				for(var i = 0; i < aaRows.length; i++) {
					var aa = aaRows[i].aminoAcid;
					// GQ331046, GenBank record: nonfunctional middle S [PRE_S2] protein due to mutation of codon 1 M to V.
					// KM606737 and D23679 -- have same mutation but no mention of this in GenBank.
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