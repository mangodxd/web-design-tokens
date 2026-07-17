import logging
import os
from logging.handlers import RotatingFileHandler

"""
/**
 * logger.py - Logging Setup Module
 *
 * Initializes a rotating file logger with a maximum size of 5MB and 5 backup files.
 * Logs are stored in the 'logs' directory and include timestamps, logger names,
 * log levels, and messages.
 */
"""

def setup_logger(name: str):
    log_dir = 'logs'
    os.makedirs(log_dir, exist_ok=True)

    logger = logging.getLogger(name)

    if not logger.handlers:
        logger.setLevel(logging.DEBUG)

        fpath = os.path.join(log_dir, 'app.log')
        fhandler = RotatingFileHandler(
            fpath,
            maxBytes=1024*1024*5, #5mb
            backupCount=5,
            encoding='utf-8'
        )

        format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        fhandler.setFormatter(format)
        logger.addHandler(fhandler)
        logger.propagate = False
    return logger
