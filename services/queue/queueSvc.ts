interface IQueueSvc<T> {
    registerQueue: (elems: T[], stride: number) => void;
    next: () => T[];
    rollback: () => void;
}

class QueueSvc<T> implements IQueueSvc<T> {
    private queue: T[] | null;
    private stride: number | null;
    private current: number;

    constructor() {
        this.queue = null;
        this.stride = null;
        this.current = 0;
    }

    public registerQueue(elems: T[], stride: number) {
        this.queue = elems;
        this.stride = stride;
        return;
    }

    public next() {
        if (!this.queue || !this.stride) {
            console.error('queue elems not defined yet');
            return [];
        }

        const nextQueue = this.queue.slice(this.current, this.current + this.stride >= +this.queue.length ? +this.queue.length : this.current + this.stride);

        this.current = this.current + this.stride >= +this.queue.length ? 0 : +this.current + this.stride;

        return nextQueue;
    }

    public rollback() {
        if (!this.stride) {
            console.error('queue elems not defined yet');
            return;
        }

        this.current = this.current - this.stride;
        return;
    }
}

export default new QueueSvc();
