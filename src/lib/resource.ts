import ConfigManager from "./config_manager";

interface ResourceType {
    id: number;
    toJSON(): Object;
}

export default class Resource<Type extends ResourceType> {
    store: ConfigManager;
    constructor(store: ConfigManager) {
        this.store = store;
    }
    private instances: Map<number, Type>;
    find(id: number): Type|null {
        return this.instances.get(id);
    }
    findAll(): Type[] {
        return [...this.instances.values()];
    }
    insert(newObj: Type): Type|Error {
        if (this.instances.has(newObj.id)) {
            return Error(`ID ${newObj.id} already exists.`)
        }
    }
    update(newObj: Type): Type | Error {
        if (!this.instances.has(newObj.id)) {
            return Error(`Could not find resource with ID ${newObj.id}`);
        }
            this.instances.set(newObj.id, newObj);
    }
    upsert(newObj: Type): Type {
        this.instances.set(newObj.id, newObj);
        return this.instances.get(newObj.id);
    }
    delete(id: number): Type {
        const obj = this.instances.get(id);
        this.instances.delete(id);
        return obj;
    }
    save() {
        this.store.set('robots', this.toJSON());
    }
    toJSON() {
        return this.instances.values().map(i => i.toJSON());
    }

        

}

