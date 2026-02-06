import { reactive } from "vue";

const pendingRefresh = reactive({
	value: false,
	set(newValue: boolean) {
		this.value = newValue;
	}
});

const search = reactive({
	value: "",
	set(newValue: string) {
		this.value = newValue.toLowerCase();
	}
});

const viewMode = reactive({
	value: localStorage.getItem("list_view") || "list",
	set(newValue: "list"|"grid") {
		this.value = newValue;
		localStorage.setItem("list_view", this.value);
	}
});

const zoomLevel = reactive({
	value: localStorage.getItem("list_zoomLevel") || "60",
	set(newValue: number) {
		this.value = newValue.toString();
		localStorage.setItem("list_zoomLevel", this.value);
	},
	get() {
		return Number(this.value);
	},
	css() {
		return this.value + "px";
	}
});

export default function useListStore() {
	return {
		pendingRefresh,
		search,
		viewMode,
		zoomLevel
	};
};