import * as fs from "fs";
import { Document } from "langchain/document";
import { load } from "cheerio";

const processFile = async (filePath: string): Promise<Document> => {
    return await new Promise<Document>((resolve, reject) => {
        fs.readFile(filePath, "utf8", (err, fileContents) => {
            if (err) {
                reject(err);
            } else {
                const text = load(fileContents).text();
                const metadata = { source: filePath }
                const doc = new Document({ pageContent: text, metadata: metadata });
                resolve(doc);
            }
        })
    })
}
