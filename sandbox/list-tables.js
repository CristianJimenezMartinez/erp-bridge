var args = WScript.Arguments;
if (args.Length < 1) {
  WScript.Echo("Usage: cscript list-tables.js <dbPath>");
  WScript.Quit(1);
}
var dbPath = args(0);
var conn = new ActiveXObject("ADODB.Connection");
var connStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=" + dbPath + ";Persist Security Info=False;";
try {
  conn.Open(connStr);
} catch (e) {
  connStr = "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=" + dbPath + ";Persist Security Info=False;";
  conn.Open(connStr);
}

var rs = conn.OpenSchema(20); // 20 = adSchemaTables
while (!rs.EOF) {
  var tableType = "" + rs.Fields("TABLE_TYPE").Value;
  var tableName = "" + rs.Fields("TABLE_NAME").Value;
  if (tableType === "TABLE") {
    WScript.Echo(tableName);
  }
  rs.MoveNext();
}
rs.Close();
conn.Close();
