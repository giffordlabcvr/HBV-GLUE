/**
 * This module generates various objects (reference sequences, module configs, alignments) based on a
 * single JSON file which defines the clade structure and reference sequence choices.
 * 
 * The point of this is to have these choices in one place, so that they can be updated easily.
 */



function getRefSeqName(alignmentObj, refSeqObj) {
	return "REF_"+getCladeID(alignmentObj)+"_"+refSeqObj.sequenceID;
}

function getCladeID(alignmentObj) {
	return alignmentObj.alignmentName.replace("AL_", "");
}


function generateRefSeqNcbiImporter(ncbiImporterFile) {
	
	var cladeStructure = loadJsonCladeStructure();
	
	var refSeqImporterString = 
		"<ncbiImporter>\n"+
		"  <sequenceFormat>GENBANK_XML</sequenceFormat>\n"+
		"  <specificPrimaryAccessions>\n"+
	    "    <primaryAccession>NC_003977</primaryAccession>\n"+ // master reference
	    "    <primaryAccession>X02763</primaryAccession>\n"; // suggested numbering reference

	var sourceName = cladeStructure.referenceSourceName;
	
	visitStructureRefseqs(cladeStructure, function(refseq) {
		refSeqImporterString += 
			"    <primaryAccession>"+refseq.sequenceID+"</primaryAccession>\n"
	});
	
	refSeqImporterString += 
		"  </specificPrimaryAccessions>\n"+
		"  <sequenceIdField>PRIMARY_ACCESSION</sequenceIdField>\n"+
		"  <sourceName>"+sourceName+"</sourceName>\n"+
		"</ncbiImporter>\n";
		
	glue.command(["file-util", "save-string", refSeqImporterString, ncbiImporterFile]);
}

function createGlueReferenceSequences() {

	glue.command(["create", "reference", "REF_NUMBERING_X02763", "ncbi-refseqs", "X02763"]);
	
	var cladeStructure = loadJsonCladeStructure();
	var sourceName = cladeStructure.referenceSourceName;

	
	visitStructureAlignmentsPost(cladeStructure, function(alignment) {
		var allRefs = [];
		allRefs.push(alignment.constrainingRef);
		if(alignment.referenceSequences != null) {
			allRefs = allRefs.concat(alignment.referenceSequences);
		}
		allRefs = _.uniq(allRefs, function(refSeqObj) { return refSeqObj.sequenceID; });
		_.each(allRefs, function(refSeqObj) {
			var refSeqName = getRefSeqName(alignment, refSeqObj);
			glue.command(["create", "reference", refSeqName, sourceName, refSeqObj.sequenceID]);

			if(alignment.almtDisplayName != null) {
				glue.inMode("reference/"+refSeqName, function() {
					glue.command(["set", "field", "displayName", alignment.almtDisplayName+" Reference ("+refSeqObj.sequenceID+")"]);
				});
			}
		});
	});

}

function pad(num, size) {
    var s = num+"";
    while (s.length < size) {
    	s = "0" + s;
    }
    return s;
}

function createAlignmentTree() {

	var cladeStructure = loadJsonCladeStructure();
	var sourceName = cladeStructure.referenceSourceName;
	var masterRefObj = cladeStructure.constrainingRef;
	var masterRefName = getRefSeqName(cladeStructure, masterRefObj);
	var masterAlmtName = cladeStructure.alignmentName;
	glue.command(["delete", "alignment", masterAlmtName]);
	glue.command(["create", "alignment", masterAlmtName, "--refSeqName", masterRefName]);
	visitStructureAlignmentsPre(cladeStructure, function(alignment) {
		glue.inMode("/alignment/"+alignment.alignmentName, function() {
			glue.command(["set", "field", "clade_category", alignment.cladeCategory]);
			if(alignment.almtDisplayName != null) {
				glue.command(["set", "field", "displayName", alignment.almtDisplayName]);
				glue.command(["set", "field", "minimal_name", alignment.almtDisplayName.replace("Genotype ", "").replace("Subgenotype ", "")]);
			}
		});
		if(alignment.childAlignments != null) {
			_.each(alignment.childAlignments, function(childAlignment) {
				glue.command(["delete", "alignment", childAlignment.alignmentName]);
				glue.inMode("/alignment/"+alignment.alignmentName, function() {
					var childRefName = getRefSeqName(childAlignment, childAlignment.constrainingRef);
					glue.command(["add", "member", "--refName", childRefName]);
					glue.command(["extract", "child", childAlignment.alignmentName, "--refName", childRefName]);
					// this demote member command is just to get the referenceMember flag set to true on the member
					// in the parent alignment.
					glue.command(["demote", "member", childAlignment.alignmentName, "--member", sourceName, childAlignment.constrainingRef.sequenceID]);

				});
			});
		}
		if(alignment.referenceSequences != null) {
			_.each(alignment.referenceSequences, function(refObj) {
				glue.inMode("/alignment/"+alignment.alignmentName, function() {
					glue.command(["add", "member", sourceName, refObj.sequenceID]);
				});
			});
		}
		glue.inMode("/alignment/"+alignment.alignmentName, function() {
			glue.command(["derive", "segments", "AL_UNCONSTRAINED", "--existingMembersOnly", "--allMembers"]);
		});
			
	});

}


function loadJsonCladeStructure() {
	var loadedString = 
		glue.command(["file-util", "load-string", "json/clade_structure_and_refs.json"]).fileUtilLoadStringResult.loadedString;
	return JSON.parse(loadedString);
}

// visit all refseq objects in post-order fashion
function visitStructureRefseqs(structureNode, refseqCallback) {
	if(structureNode.childAlignments != null) {
		_.each(structureNode.childAlignments, function(childAlignment) {
			visitStructureRefseqs(childAlignment, refseqCallback);
		});
	}
	if(structureNode.referenceSequences != null) {
		_.each(structureNode.referenceSequences, refseqCallback);
	}
}

//visit all alignment objects in post-order fashion
function visitStructureAlignmentsPost(structureNode, alignmentCallback) {
	if(structureNode.childAlignments != null) {
		_.each(structureNode.childAlignments, function(childAlignment) {
			visitStructureAlignmentsPost(childAlignment, alignmentCallback);
		});
	}
	alignmentCallback(structureNode);
}

//visit all alignment objects in pre-order fashion
function visitStructureAlignmentsPre(structureNode, alignmentCallback) {
	alignmentCallback(structureNode);
	if(structureNode.childAlignments != null) {
		_.each(structureNode.childAlignments, function(childAlignment) {
			visitStructureAlignmentsPre(childAlignment, alignmentCallback);
		});
	}
}
