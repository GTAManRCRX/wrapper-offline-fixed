export default interface StudioObject extends HTMLObjectElement {

	importerAddAsset(assetType: string, assetId: string): void;

	importerStatus(status: "clear" | "done" | "processing"): void;

	importerUploadComplete(
		assetType: string,
		assetId: string,
		assetData: Record<string, string> | {

			file: string,

			enc_asset_id: string,

			title: string,

			tags: string
		}
	): void;

	loadCharacterById(assetId: string): void;

	onExternalPreviewPlayerPublish(): void
};