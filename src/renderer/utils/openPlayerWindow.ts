export default function openPlayerWindow(movieId: string) {
    const isWideRaw = localStorage.getItem("isWide_active");
    const isWide = isWideRaw === null ? true : (isWideRaw === "true" || isWideRaw === "1");

    const width = Math.round(Math.max(screen.availWidth * 0.6666));

    const videoHeight = isWide ? Math.round(width / (16 / 9)) : Math.round(width / (14 / 9));

    const basePadding = isWide ? 26 : 26;
    const framePadding = basePadding;

    const height = videoHeight + framePadding;

    const left = Math.round((screen.availWidth - width) / 2);
    const top = Math.round((screen.availHeight - height) / 2);

    window.open(
        `?redirect=/movies/play/${movieId}`,
        "Video player - Wrapper offline",
        `width=${width},height=${height},left=${left},top=${top},menubar=no,status=no,resizable=no`
    );
}