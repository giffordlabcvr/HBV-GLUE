var rotationResultObjs;

var whereClause = "source.name = 'ncbi-refseqs'";

glue.command(["multi-unset", "field", "sequence", "-w", whereClause, "rotation"]);

/*
	Refseq NC_003977 is actually off by 2 nucleotides relative to the "standard" circular numbering system.

	https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5084120/
	"Contemporary co-ordinate numbering of the HBV genome assigns a position of 1 to the first 'T' 
	nucleotide after the EcoR1 restriction site (G|AATTC) when sequenced in the forward direction."

	https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3531116/
	"A standard numbering system of HBV genomes exists, defined by the (often hypothetical) EcoR1 
	restriction site as the origin of the genome (27)"

	Original sequencing of HBV: 
	https://www.ncbi.nlm.nih.gov/pmc/articles/PMC325833/
*/

// a more automated way to do this might be to just recognise the EcoR1 nucleotide motif, which seems to be
// TGGAA[CT]TC
// The '1' location is then just after the AA within this motif


/**
 * Most refseqs meet the standard. Those that don't are just a little bit off.
 */
shiftLeft("NC_003977", 2);
shiftLeft("AB126581", 2);
shiftLeft("AY090454", 3);
shiftLeft("AY090457", 3);
shiftLeft("AY128092", 2);
shiftLeft("X80926", 2);

function shiftLeft(refSeqId, leftShift) {
	glue.inMode("sequence/ncbi-refseqs/"+refSeqId, function() {
		var length = glue.command(["show", "length"]).lengthResult.length;
		glue.command(["set", "field", "rotation", length-leftShift]);
	});
}
