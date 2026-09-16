import { fetchInstagramGraphql } from "../src/lib/instagram-graphql.ts";

const code = process.argv[2] || "DbsWcfSuLck";
const result = await fetchInstagramGraphql(code);
console.log(result);
