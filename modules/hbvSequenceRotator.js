function rotateSequence(sequenceWhereClause) {
	var fastaDocument;
	glue.inMode("module/hbvFastaExporter", function() {
		fastaDocument = glue.command(["export", "-w", sequenceWhereClause, "--preview"]);
	});
	return rotateFastaDocument(fastaDocument);
}

function rotateFastaFile(fileName) {
	var fastaDocument;
	glue.inMode("module/hbvFastaUtility", function() {
		fastaDocument = glue.command(["load-nucleotide-fasta", fileName]);
	});
	return rotateFastaDocument(fastaDocument);
}

function rotateFastaDocument(fastaDocument) {
	var rotationObjs = [];
	_.each(fastaDocument.nucleotideFasta.sequences, function(seqObj) {
		var seqID = seqObj.id;
		var seqNts = seqObj.sequence;
		
		var startRegex = /AGT[TG]G[AG]A[GCT]TC[ACT][ATG]CAGC/;
		
		rotationObjs.push({
			querySequenceId: seqID, 
			status: "NO_ROTATION_NECESSARY",
			rotationNts: null
		});
	});
	return rotationObjs;
}