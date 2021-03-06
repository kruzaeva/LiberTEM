class Message(object):
    """
    possible messages - the translation of our python datatypes to json types
    """

    def __init__(self, data):
        self.data = data

    def initial_state(self, jobs, datasets):
        return {
            "status": "ok",
            "messageType": "INITIAL_STATE",
            "datasets": datasets,
            "jobs": jobs,
        }

    def config(self, config):
        return {
            "status": "ok",
            "messageType": "CONFIG",
            "config": config,
        }

    def create_dataset(self, dataset, details):
        return {
            "status": "ok",
            "messageType": "CREATE_DATASET",
            "dataset": dataset,
            "details": details,
        }

    def create_dataset_error(self, dataset, msg):
        return {
            "status": "error",
            "messageType": "CREATE_DATASET_ERROR",
            "dataset": dataset,
            "msg": msg,
        }

    def delete_dataset(self, dataset):
        return {
            "status": "ok",
            "messageType": "DELETE_DATASET",
            "dataset": dataset,
        }

    def dataset_detect(self, params):
        return {
            "status": "ok",
            "messageType": "DATASET_DETECTED",
            "datasetParams": params,
        }

    def dataset_detect_failed(self, path):
        return {
            "status": "error",
            "messageType": "DATASET_DETECTION_FAILED",
            "path": path,
            "msg": "could not automatically determine dataset format",
        }

    def start_job(self, job_id):
        return {
            "status": "ok",
            "messageType": "JOB_STARTED",
            "job": job_id,
            "details": self.data.serialize_job(job_id),
        }

    def job_error(self, job_id, msg):
        return {
            "status": "error",
            "messageType": "JOB_ERROR",
            "job": job_id,
            "msg": msg,
        }

    def finish_job(self, job_id, num_images, image_descriptions):
        return {
            "status": "ok",
            "messageType": "FINISH_JOB",
            "job": job_id,
            "details": self.data.serialize_job(job_id),
            "followup": {
                "numMessages": num_images,
                "descriptions": image_descriptions,
            },
        }

    def cancel_job(self, job_id):
        return {
            "status": "ok",
            "messageType": "CANCEL_JOB",
            "job": job_id,
        }

    def cancel_failed(self, job_id):
        return {
            "status": "error",
            "messageType": "CANCEL_JOB_FAILED",
            "job": job_id,
        }

    def task_result(self, job_id, num_images, image_descriptions):
        return {
            "status": "ok",
            "messageType": "TASK_RESULT",
            "job": job_id,
            "followup": {
                "numMessages": num_images,
                "descriptions": image_descriptions,
            },
        }

    def directory_listing(self, path, files, dirs, drives, places):
        def _details(item):
            return {
                "name":  item["name"],
                "size":  item["stat"].st_size,
                "ctime": item["stat"].st_ctime,
                "mtime": item["stat"].st_mtime,
                "owner": item["owner"],
            }

        return {
            "status": "ok",
            "messageType": "DIRECTORY_LISTING",
            "drives": drives,
            "places": places,
            "path": path,
            "files": [
                _details(f)
                for f in files
            ],
            "dirs": [
                _details(d)
                for d in dirs
            ],
        }

    def browse_failed(self, path, code, msg, alternative=None):
        return {
            "status": "error",
            "messageType": "DIRECTORY_LISTING_FAILED",
            "path": path,
            "code": code,
            "msg": msg,
            "alternative": alternative,
        }
