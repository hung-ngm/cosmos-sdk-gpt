import { Document } from 'langchain/document';
import { load } from "cheerio";
import path from "path";
import * as fs from "fs";
import { BaseDocumentLoader } from "langchain/document_loaders";
import { Embeddings, OpenAIEmbeddings } from "langchain/embeddings";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseVectorStore } from "langchain/vectorstores";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { supabaseClient } from "../utils/supabase-client";

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

class RepoLoader extends BaseDocumentLoader {
    constructor(public filePath: string) {
        super();
    }

    async load(): Promise<Document[]> {
        return await processDirectory(this.filePath);
    }
}

const embedDocuments = async (
    client: SupabaseClient,
    docs: Document[],
    embeddings: Embeddings
) => {
    console.log("Creating embeddings...");
    await SupabaseVectorStore.fromDocuments(docs, embeddings, {
        client
    });
    console.log("Embeddings successfully stored in Supabase.");
}

const splitDocsIntoChunks = async (docs: Document[]): Promise<Document[]> => {
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 8000,
        chunkOverlap: 100
    }) 
    return await textSplitter.splitDocuments(docs)
}

const directoryPath = "ingest/markdown/cosmos-sdk"
const loader = new RepoLoader(directoryPath);

(async function run() {
    try {
        const rawDocs = await loader.load();
        console.log("Loader created.");
        const docs = await splitDocsIntoChunks(rawDocs);
        console.log("Docs splitted.");
        await embedDocuments(supabaseClient, docs, new OpenAIEmbeddings());
        console.log("Documents embedded into Supabase Vectorstore");
    } catch (error) {
        console.log("error", error);
    }
})();