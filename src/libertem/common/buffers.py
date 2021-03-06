import mmap
import math
import numpy as np

from libertem.common.shape import Shape
from libertem.common.slice import Slice


def _alloc_aligned(size):
    # round up to 4k blocks:
    blocksize = 4096
    blocks = math.ceil(size / blocksize)

    # flags are by default MAP_SHARED, which has to be set
    # to prevent possible corruption (see open(2)). If you
    # are adding flags here, make sure to include MAP_SHARED
    # (and check for windows compat)
    return mmap.mmap(-1, blocksize * blocks)


def bytes_aligned(size):
    buf = _alloc_aligned(size)
    # _alloc_aligned may give us more memory (for alignment reasons), so crop it off the end:
    return memoryview(buf)[:size]


def empty_aligned(size, dtype):
    size_flat = np.product(size)
    dtype = np.dtype(dtype)
    buf = _alloc_aligned(dtype.itemsize * size_flat)
    # _alloc_aligned may give us more memory (for alignment reasons), so crop it off the end:
    npbuf = np.frombuffer(buf, dtype=dtype)[:size_flat]
    return npbuf.reshape(size)


def zeros_aligned(size, dtype):
    res = empty_aligned(size, dtype)
    res[:] = 0
    return res


class BufferWrapper(object):
    """
    Helper class to automatically allocate buffers, either for partitions or
    the whole dataset, and create views for partitions or single frames.

    This is used as a helper to allow easy merging of results without needing
    to manually handle indexing.

    Usually, as a user, you only need to instantiate this class, specifying `kind`,
    `dtype` and sometimes `extra_shape` parameters. Most methods are meant to be called
    from LiberTEM-internal code, for example the UDF functionality.
    """
    def __init__(self, kind, extra_shape=(), dtype="float32"):
        """
        Parameters
        ----------
        kind : "nav" or "sig"
            The rough shape of the buffer, either corresponding to the navigation
            or the signal dimensions of the dataset

        extra_shape : optional, tuple of int
            You can specify additional dimensions for your data. For example, if
            you want to store 2D coords, you would specify (2,) here.

        dtype : string or numpy dtype
            The dtype of this buffer
        """
        self._kind = kind
        self._extra_shape = extra_shape
        self._dtype = np.dtype(dtype)
        self._data = None
        self._shape = None
        self._ds_shape = None
        self._roi = None

    def set_shape_partition(self, partition, roi=None):
        self._roi = roi
        self._shape = self._shape_for_kind(self._kind, partition.shape, roi)

    def set_shape_ds(self, dataset, roi=None):
        self._roi = roi
        self._shape = self._shape_for_kind(self._kind, dataset.shape.flatten_nav(), roi)
        self._ds_shape = dataset.shape

    def _shape_for_kind(self, kind, orig_shape, roi=None):
        if self._kind == "nav":
            if roi is None:
                nav_shape = tuple(orig_shape.nav)
            else:
                nav_shape = (np.count_nonzero(self._roi),)
            return nav_shape + self._extra_shape
        elif self._kind == "sig":
            return tuple(orig_shape.sig) + self._extra_shape
        elif self._kind == "single":
            if len(self._extra_shape) > 0:
                return self._extra_shape
            else:
                return (1, )
        else:
            raise ValueError("unknown kind: %s" % kind)

    @property
    def data(self):
        """
        Get the buffer contents in shape that corresponds to the
        original dataset shape. If a ROI is set, embed the result into a new
        array; unset values have nan value.
        """
        if self._roi is None:
            return self._data.reshape(self._shape_for_kind(self._kind, self._ds_shape))
        shape = self._shape_for_kind(self._kind, self._ds_shape)
        wrapper = np.full(shape, np.nan, dtype=self._dtype)
        wrapper[self._roi] = self._data
        return wrapper

    @property
    def raw_data(self):
        """
        Get the raw data underlying this buffer, which is flattened and
        may be even filtered to a ROI
        """
        return self._data

    def allocate(self):
        """
        Allocate a new buffer, in the shape previously set
        via one of the `set_shape_*` methods.
        """
        assert self._shape is not None
        assert self._data is None
        if self.roi_is_zero:
            self._data = zeros_aligned(1, dtype=self._dtype)
        else:
            self._data = zeros_aligned(self._shape, dtype=self._dtype)

    def set_buffer(self, buf):
        """
        Set the underlying buffer to an existing numpy array. The
        shape must match with the shape of nav or sig of the dataset,
        plus extra_shape, as determined by the `kind` and `extra_shape`
        constructor arguments.
        """
        assert self._data is None
        assert buf.shape == self._shape
        assert buf.dtype == self._dtype
        self._data = buf

    def has_data(self):
        return self._data is not None

    @property
    def roi_is_zero(self):
        return np.product(self._shape) == 0

    def _slice_for_partition(self, partition):
        """
        Get a Slice into self._data for `partition`, taking the current ROI into account.

        Because _data is "compressed" if a ROI is set, we can't directly index and must
        calculate a new slice from the ROI.
        """
        if self._roi is None:
            return partition.slice
        else:
            roi = self._roi.reshape((-1,))
            slice_ = partition.slice
            s_o = slice_.origin[0]
            s_s = slice_.shape[0]
            # We need to find how many 1s there are for all previous partitions, to know
            # the origin; then we count how many 1s there are in our partition
            # to find our shape.
            origin = np.count_nonzero(roi[:s_o])
            shape = np.count_nonzero(roi[s_o:s_o + s_s])
            sig_dims = slice_.shape.sig.dims
            slice_ = Slice(
                origin=(origin,) + slice_.origin[-sig_dims:],
                shape=Shape((shape,) + tuple(slice_.shape.sig), sig_dims=sig_dims),
            )
            return slice_

    def get_view_for_partition(self, partition):
        """
        get a view for a single partition in a dataset-sized buffer
        (dataset-sized here means the reduced result for a whole dataset,
        not the dataset itself!)
        """
        if self._kind == "nav":
            slice_ = self._slice_for_partition(partition)
            return self._data[slice_.get(nav_only=True)]
        elif self._kind == "sig":
            return self._data[partition.slice.get(sig_only=True)]
        elif self._kind == "single":
            return self._data

    def get_view_for_frame(self, partition, tile, frame_idx):
        """
        get a view for a single frame in a partition-sized buffer
        (partition-sized here means the reduced result for a whole partition,
        not the partition itself!)
        """
        assert partition.shape.dims == partition.shape.sig.dims + 1
        if self._kind == "sig":
            return self._data[partition.slice.get(sig_only=True)]
        elif self._kind == "nav":
            partition_slice = self._slice_for_partition(partition)
            result_idx = (tile.tile_slice.origin[0] + frame_idx - partition_slice.origin[0],)
            # shape: (1,) + self._extra_shape
            if len(self._extra_shape) > 0:
                return self._data[result_idx]
            else:
                return self._data[result_idx + (np.newaxis,)]
        elif self._kind == "single":
            return self._data
