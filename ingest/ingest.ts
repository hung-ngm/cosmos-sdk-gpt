import * as fs from "fs";
import { Document } from "langchain/document";
import { load } from "cheerio";
import path from "path";

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

const processDirectory = async (directoryPath: string): Promise<Document[]> => {
    const docs: Document[] = [];
    let files: string[];
    try {
        files = fs.readdirSync(directoryPath);
    } catch (err) {
        console.error(err);
        throw new Error(
            `Could not read directory: ${directoryPath}.`
        );
    }
    for (const file of files) {
        const filePath = path.join(directoryPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            const newDocs = processDirectory(filePath);
            const nestedDocs = await newDocs;
            docs.push(...nestedDocs);
        } else {
            const newDoc = processFile(filePath);
            const doc = await newDoc;
            docs.push(doc);
        }
    }
    return docs;
}
